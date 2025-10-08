from django.db import models
from django.conf import settings
from backend.doctor.models import Patients

# Create your models here.
class Prognostics(models.Model):
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='prognostics', on_delete=models.CASCADE, blank=False)
    patient = models.ForeignKey(Patients, on_delete=models.CASCADE, blank=False)
    prognostic = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Prognostic'
        verbose_name_plural = 'Prognostics'
        ordering = ['prognostic']
        indexes = [
            models.Index(fields=['doctor']),
            models.Index(fields=['patient']),
            models.Index(fields=['-updated_at']),
            models.Index(fields=['prognostic']),
        ]
        
        
    def __str__(self):
        return self.prognostic