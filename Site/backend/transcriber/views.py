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
        model = whisper.load_model("base")
        audio_path = os.path.join(settings.MEDIA_ROOT, audio.audio_file.name)
        result = model.transcribe(audio_path, language="pt")
        text = result["text"].strip()
        transcript = Transcript.objects.create(audio=audio, text=text)
        return JsonResponse({'transcript': transcript.text, 'already_exists': False})

@method_decorator(csrf_exempt, name='dispatch')
class LiveTranscribeChunkView(View):
    def post(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return JsonResponse({'error': 'No audio file provided.'}, status=400)
        # Save chunk to a temporary file
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=True) as temp_audio:
            for chunk in audio_file.chunks():
                temp_audio.write(chunk)
            temp_audio.flush()
            # Transcribe with Whisper
            model = whisper.load_model("base")
            result = model.transcribe(temp_audio.name, language="pt")
            text = result["text"].strip()
        return JsonResponse({'transcript': text})
