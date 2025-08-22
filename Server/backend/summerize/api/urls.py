from django.urls import path
from .views import SummarizeTranscriptAPIView

app_name = 'summerizer'

urlpatterns = [
    path('api/summarize/', SummarizeTranscriptAPIView.as_view(), name='summarize-transcript'),
]
