from django.urls import path, include
from . import views

app_name = 'doctor'

urlpatterns = [
    path('token-auth/', 
          views.CustomAuthToken.as_view(), 
          name='token-auth'),
    path('password_reset/',
          include('django_rest_passwordreset.urls',
          namespace='password_reset')),
    path('account/',
          views.AccountAPI.as_view(),
          name='account'),
]