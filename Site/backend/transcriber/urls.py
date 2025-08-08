from django.urls import path
from .views import TranscribeAudioView


app_name = 'transcriber'

urlpatterns = [
    path('transcribe/<int:audio_id>/', TranscribeAudioView.as_view(), name='transcribe_audio'),
    
] 