from django.db import models
from audio_rec.models import AudioRecording

# Create your models here.

class Transcript(models.Model):
    audio = models.OneToOneField(AudioRecording, on_delete=models.CASCADE, related_name='transcript')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transcript for {self.audio.id} at {self.created_at}"
