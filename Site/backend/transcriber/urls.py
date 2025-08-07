from django.urls import path
from .views import TranscribeAudioView
from .views import LiveTranscribeChunkView

app_name = 'transcriber'

urlpatterns = [
    path('transcribe/<int:audio_id>/', TranscribeAudioView.as_view(), name='transcribe_audio'),
    path('transcribe/live/', LiveTranscribeChunkView.as_view(), name='live_transcribe'),
] 