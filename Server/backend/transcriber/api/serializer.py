from rest_framework import serializers

class AudioUploadSerializer(serializers.Serializer):
    """Serializer for audio file upload."""
    audio = serializers.FileField(required=True)