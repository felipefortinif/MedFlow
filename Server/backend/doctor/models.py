from django.db import models
from django.conf import settings

class Specialties(models.Model):
    specialty = models.CharField(max_length=255, blank=False)
    slug = models.SlugField(max_length=255, blank=False, unique=True)
    
    class Meta:
        verbose_name = 'Specialty'
        verbose_name_plural = 'Specialties'
        ordering = ['specialty']
        
    def __str__(self):
        return self.specialty

class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL,on_delete=models.CASCADE)
    cpf = models.CharField(max_length=20, blank=False, unique=True)
    date_of_birth = models.DateField(blank=True, null=True)
    # photo = models.ImageField(upload_to='users/%Y/%m/%d/',blank=True)
    phone = models.CharField(max_length=20, blank=True)
    crm = models.CharField(max_length=20, blank=False, unique=True)
    specialty = models.ForeignKey(Specialties, on_delete=models.CASCADE, blank=False)
    
    def __str__(self):
        return f'Profile of {self.user.email}'


class Patients(models.Model):
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='patients', on_delete=models.CASCADE, blank=False)
    name = models.CharField(max_length=255, blank=False)
    email = models.EmailField(blank=False)
    cpf = models.CharField(max_length=20, blank=False)
    date_of_birth = models.DateField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Patient'
        verbose_name_plural = 'Patients'
        ordering = ['name']
        indexes = [
            models.Index(fields=['doctor']),
            models.Index(fields=['-updated_at']),
            models.Index(fields=['name']),
        ]
        
    def __str__(self):
        return self.name



    