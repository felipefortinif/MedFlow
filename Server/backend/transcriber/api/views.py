
import whisper
import os
import tempfile
import logging
import threading
import torch

from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User

from .serializer import AudioUploadSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.parsers import JSONParser

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

# Create your views here.

logger = logging.getLogger(__name__)

# Carrega o modelo uma única vez. Pode trocar para "base" se memória for um problema.
model = whisper.load_model("medium")

# Garante que apenas uma transcrição ocorra por vez (evita race conditions internas / uso de GPU simultâneo).
model_lock = threading.Lock()


class AudioBatchUploadAPIView(APIView):
    """
    post:
    Upload an audio file and receive its transcript.
    """
    @swagger_auto_schema(
        operation_description="Upload an audio file (wav) and get the transcript.",
        request_body=AudioUploadSerializer,
        responses={
            200: openapi.Response(
                description="Transcription successful.",
                examples={"application/json": {"transcript": "Texto transcrito."}}
            ),
            400: openapi.Response(
                description="Bad request.",
                examples={"application/json": {"error": "No audio file provided."}}
            )
        }
    )
    def post(self, request):
        serializer = AudioUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        audio_file = serializer.validated_data['audio']
        tmp_path = None
        # Detecta tipo para salvar com extensão coerente
        content_type = getattr(audio_file, 'content_type', '') or ''
        if 'webm' in content_type:
            suffix = '.webm'
        elif 'mpeg' in content_type or 'mp3' in content_type:
            suffix = '.mp3'
        elif 'ogg' in content_type:
            suffix = '.ogg'
        else:
            suffix = '.wav'  # fallback
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                for chunk in audio_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
                tmp.flush()

            # Determina se podemos usar fp16 (apenas se GPU + CUDA disponível)
            use_fp16 = torch.cuda.is_available()
            try:
                with model_lock:
                    result = model.transcribe(
                        tmp_path,
                        fp16=use_fp16,
                        language="pt",
                        task="transcribe",
                        temperature=(0.0, 0.2, 0.4, 0.6),
                        best_of=5,
                        no_speech_threshold=0.6,
                        compression_ratio_threshold=2.4,
                        suppress_blank=True,
                        condition_on_previous_text=False,  # ajustar para True quando houver concat de contexto
                    )
            except RuntimeError as rt_err:
                # Fallback se FP16 falhar mesmo com GPU (ex: out of memory)
                logger.warning("Transcribe falhou com fp16=%s: %s. Retentando em fp16=False", use_fp16, rt_err)
                with model_lock:
                    result = model.transcribe(
                        tmp_path,
                        fp16=False,
                        language="pt",
                        task="transcribe",
                        temperature=(0.0, 0.2, 0.4, 0.6),
                        best_of=3,
                        no_speech_threshold=0.6,
                        compression_ratio_threshold=2.4,
                        suppress_blank=True,
                        condition_on_previous_text=False,
                    )

            transcript = (result.get("text") or "").strip()
            return Response({'transcript': transcript}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("Erro ao transcrever batch: %s", e)
            return Response({'error': f'Erro interno na transcrição: {e.__class__.__name__}: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            # Remove o temp file manualmente para não acumular lixo
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
