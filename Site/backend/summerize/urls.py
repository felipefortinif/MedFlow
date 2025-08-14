from django.urls import path
from .views import SummarizeTranscriptView

urlpatterns = [
    path('', SummarizeTranscriptView.as_view(), name='summarize-transcript'),
]
