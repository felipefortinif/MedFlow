from rest_framework import serializers
from doctor.models import Profile, Patients, Prognostics, Specialties

class DoctorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            'id',
            'cpf',
            'date_of_birth',
            # 'photo',
            'phone',
            'crm',
            'specialty',
        ]
        
        def to_representation(self, instance):
            representation = super().to_representation(instance)
            representation['username'] = instance.user.username
            return representation

class PatientsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patients
        fields = [
            'doctor',
            'name',
            'email',
            'cpf',
            'date_of_birth',
            'phone',
        ]

class PrognosticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prognostics
        fields = [
            'doctor',
            'patient',
            'prognostic',
        ]

class SpecialtiesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialties
        fields = [
            'specialty',
            'slug',
        ]