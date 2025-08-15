from django.db import models

# Create your models here.

class AudioRecording(models.Model):
    audio_file = models.FileField(upload_to='audio_recordings/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
