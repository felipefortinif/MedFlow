from django.urls import path, include
from . import views

app_name = 'prontuarios'

urlpatterns = [
    path('prontuarios_list/',
          views.ProntuariosList.as_view(),
          name='prontuarios_list'),
    path('',
          views.ProntuariosAPIView.as_view(),
          name='prontuario'),
]
