from django.shortcuts import render
from django.http import JsonResponse, Http404
from django.views import View
from .models import Transcript
import whisper
import os
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import tempfile

# Create your views here.

model = whisper.load_model("medium")


@method_decorator(csrf_exempt, name='dispatch')
class AudioBatchUploadView(View):
    def post(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return JsonResponse({'error': 'No audio file provided.'}, status=400)
        
        
        # Save uploaded file to a temp file for Whisper
        try: 
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:       #delete=False, pois no windows delete=True da erro de permissão
                for chunk in audio_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
                tmp.flush()
                result = model.transcribe(tmp.name, language="pt")
            transcript = result["text"].strip()
            return JsonResponse({'message': 'got it', 'transcript': transcript})
        
        finally:
            # Remove o temp file manualmente para não acumular lixo
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

