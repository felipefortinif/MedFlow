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
        # Include user's email inside the profile representation for convenience
        try:
            representation['email'] = instance.user.email
        except Exception:
            pass
        return representation

class PatientsSerializer(serializers.ModelSerializer):
    doctor = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    email = serializers.EmailField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True)
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