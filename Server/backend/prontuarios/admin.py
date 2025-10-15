from django.contrib import admin
from .models import Prontuarios

# Register your models here.
admin.site.register(Prontuarios)
class ProntuariosAdmin(admin.ModelAdmin):
    list_display = ['id', 'doctor', 'patient', 'prontuario', 'created_at']
    search_fields = ['doctor__email', 'patient__name', 'prontuario']
    list_filter = ['doctor', 'created_at']
