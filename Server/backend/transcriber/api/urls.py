from django.urls import path
from .views import AudioBatchUploadAPIView


app_name = 'transcriber'

urlpatterns = [
    path('api/transcribe/batch/', AudioBatchUploadAPIView.as_view(), name='transcribe_batch'),
] 