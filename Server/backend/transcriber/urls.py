from django.urls import path
from .views import TranscribeAudioView, AudioBatchUploadView


app_name = 'transcriber'

urlpatterns = [
    path('transcribe/<int:audio_id>/', TranscribeAudioView.as_view(), name='transcribe_audio'),
    path('transcribe/batch/', AudioBatchUploadView.as_view(), name='transcribe_batch'),
] 