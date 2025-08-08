from django.shortcuts import render
from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import AudioRecording
import uuid


# main_page view removed; now in main/views.py

@method_decorator(csrf_exempt, name='dispatch')
class AudioUploadView(View):
    def post(self, request, *args, **kwargs):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return JsonResponse({"error": "No audio file provided."}, status=400)
        # Assign a unique filename
        ext = audio_file.name.split('.')[-1]
        audio_file.name = f"{uuid.uuid4()}.{ext}"
        recording = AudioRecording.objects.create(audio_file=audio_file)
        return JsonResponse({"message": "Audio uploaded successfully.", "id": recording.id})
