from django.db import models

# Create your models here.

class Transcript(models.Model):
    
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transcript at {self.created_at}"
