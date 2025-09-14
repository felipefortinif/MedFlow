from django.urls import path, include
from . import account_views
from . import specialty_views
from . import patients_views

app_name = 'doctor'

urlpatterns = [
    path('token-auth/', 
          account_views.CustomAuthToken.as_view(), 
          name='token-auth'),
    path('password_reset/',
          include('django_rest_passwordreset.urls',
          namespace='password_reset')),
    path('account/',
          account_views.AccountAPI.as_view(),
          name='account'),
    path('specialties_list/',
          specialty_views.SpecialtiesList.as_view(),
          name='specialties_list'),
    path('patients_list/',
          patients_views.PatientsList.as_view(),
          name='patients_list'),
    path('patient/',
          patients_views.PatientAPIView.as_view(),
          name='patient'),
]