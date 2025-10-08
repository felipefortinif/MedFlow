from rest_framework import serializers
from prontuarios.models import Prognostics


class PrognosticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prognostics
        fields = [
            'doctor',
            'patient',
            'prognostic',
        ]