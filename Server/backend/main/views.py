from django.shortcuts import render
from audio_rec.models import AudioRecording

# Create your views here.

def main_page(request):
    recordings = AudioRecording.objects.all().order_by('-uploaded_at')
    return render(request, "main/main_page.html", {"recordings": recordings})
