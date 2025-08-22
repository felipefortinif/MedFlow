from django.urls import path
from .views import AudioBatchUploadView


app_name = 'transcriber'

urlpatterns = [
    path('api/transcribe/batch/', AudioBatchUploadView.as_view(), name='transcribe_batch'),
] 