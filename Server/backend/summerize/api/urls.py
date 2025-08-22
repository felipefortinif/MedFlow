from django.urls import path
from .views import SummarizeTranscriptView

app_name = 'summerizer'

urlpatterns = [
    path('api/summarize/', SummarizeTranscriptView.as_view(), name='summarize-transcript'),
]
