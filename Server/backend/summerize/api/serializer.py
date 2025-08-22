from rest_framework import serializers

class SummarizeTranscriptSerializer(serializers.Serializer):
    transcript = serializers.CharField(required=True)
