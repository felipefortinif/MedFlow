from rest_framework import serializers
from prontuarios.models import Prontuarios


class ProntuariosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prontuarios
        fields = [
            'doctor',
            'patient',
            'prontuarios',
        ]
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get("include_created_at"):
            # works for model fields or computed values
            data["created_at"] = instance.created_at
        return data