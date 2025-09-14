from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as DefaultUserAdmin
from .models import Profile, Patients, Specialties

# Unregister the default User admin
admin.site.unregister(User)

@admin.register(Specialties)
class SpecialtiesAdmin(admin.ModelAdmin):
    list_display = ['specialty', 'slug']
    prepopulated_fields = {'slug': ('specialty',)}
    search_fields = ['specialty']
    
@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'cpf', 'date_of_birth', 'phone', 'crm', 'specialty']
    search_fields = ['user', 'cpf', 'specialty', 'crm']
    list_filter = ['specialty']
    
@admin.register(Patients)
class PatientsAdmin(admin.ModelAdmin):
    list_display = ['id', 'doctor', 'name', 'email', 'cpf', 'date_of_birth', 'phone']
    search_fields = ['doctor', 'name', 'email', 'cpf']
    list_filter = ['doctor']

# Now register your custom UserAdmin
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'email', 'first_name', 'last_name']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    list_filter = ['is_active', 'is_staff', 'is_superuser']

