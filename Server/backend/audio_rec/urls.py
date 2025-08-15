from django.urls import path
from .views import AudioUploadView

app_name = 'audio_rec'

urlpatterns = [
    path('upload/', AudioUploadView.as_view(), name='audio_upload'),
] 