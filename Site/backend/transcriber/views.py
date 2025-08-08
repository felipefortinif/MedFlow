from django.shortcuts import render
from django.http import JsonResponse, Http404
from django.views import View
from audio_rec.models import AudioRecording
from .models import Transcript
import whisper
import os
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import tempfile

# Create your views here.

class TranscribeAudioView(View):
    def post(self, request, audio_id):
        try:
            audio = AudioRecording.objects.get(id=audio_id)
        except AudioRecording.DoesNotExist:
            raise Http404("Audio not found")
        # Check if transcript already exists
        if hasattr(audio, 'transcript'):
            return JsonResponse({'transcript': audio.transcript.text, 'already_exists': True})
        # Run Whisper transcription
        model = whisper.load_model("medium")
        audio_path = os.path.join(settings.MEDIA_ROOT, audio.audio_file.name)
        result = model.transcribe(audio_path, language="pt")
        text = result["text"].strip()
        transcript = Transcript.objects.create(audio=audio, text=text)
        return JsonResponse({'transcript': transcript.text, 'already_exists': False})

