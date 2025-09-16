
import whisper
import os
import tempfile

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

model = whisper.load_model("medium")


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
        try:
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                for chunk in audio_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
                tmp.flush()
                result = model.transcribe(
                    tmp.name, 
                    fp16=True,
                    language="pt",
                    task="transcribe",
                    temperature= (0.0, 0.2, 0.4, 0.6),
                    best_of=5,
                    no_speech_threshold=0.6,
                    compression_ratio_threshold=2.4,
                    suppress_blank=True,
                    condition_on_previous_text=False, #<= mudar para True quando a feature de contexto estiver pronta
                    # initial_prompt= tail
                    )
            transcript = result["text"].strip()
            return Response({'transcript': transcript}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            # Remove o temp file manualmente para não acumular lixo
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
