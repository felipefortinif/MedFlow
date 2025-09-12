from django.contrib import admin
from .models import Profile, Patients, Specialties

@admin.register(Specialties)
class SpecialtiesAdmin(admin.ModelAdmin):
    list_display = ['specialty', 'slug']
    prepopulated_fields = {'slug': ('specialty',)}
    search_fields = ['specialty']
    
@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'cpf', 'date_of_birth', 'phone', 'crm', 'specialty']
    search_fields = ['user', 'cpf', 'specialty', 'crm']
    list_filter = ['specialty']
    
@admin.register(Patients)
class PatientsAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'name', 'email', 'cpf', 'date_of_birth', 'phone']
    search_fields = ['doctor', 'name', 'email', 'cpf']
    list_filter = ['doctor']

