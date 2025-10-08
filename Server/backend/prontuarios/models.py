from django.db import models
from django.conf import settings
from doctor.models import Patients

# Create your models here.
class Prontuarios(models.Model):
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='prontuarios', on_delete=models.CASCADE, blank=False)
    patient = models.ForeignKey(Patients, on_delete=models.CASCADE, blank=False)
    prontuarios = models.TextField(blank=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Prontuario'
        verbose_name_plural = 'Prontuarios'
        ordering = ['prontuarios']
        indexes = [
            models.Index(fields=['doctor']),
            models.Index(fields=['patient']),
            models.Index(fields=['prontuarios']),
        ]
        
        
    def __str__(self):
        
        rpr = "prontuarios of Dr. " + self.doctor.username + " for patient " + self.patient.name + ": "
        return rpr + self.prontuarios