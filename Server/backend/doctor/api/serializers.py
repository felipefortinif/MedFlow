from rest_framework import serializers
from doctor.models import Profile, Patients, Specialties
from django.contrib.auth.models import User

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
    doctor = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    class Meta:
        model = Patients
        fields = [
            'id',
            'doctor',
            'name',
            'email',
            'cpf',
            'date_of_birth',
            'phone',
        ]

class PatientsListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patients
        fields = [
            'id',
            'name',
        ]

class SpecialtiesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialties
        fields = [
            'id',
            'specialty',
            'slug',
        ]