

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework import routers
from rest_framework import permissions
from rest_framework.documentation import include_docs_urls
from rest_framework.schemas import get_schema_view
from drf_yasg.views import get_schema_view as yasg_schema_view
from drf_yasg import openapi

schema_view = yasg_schema_view(
    openapi.Info(
        title="API de Exemplo",
        default_version='v1',
        description="Descrição da API de exemplo",
        contact=openapi.Contact(email="lenzitomas@tecgraf.puc-rio.br"),
        license=openapi.License(name='GNU GPLv3'),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("main.urls")),
    path("transcriber/", include("transcriber.api.urls")),
    path("summerizer/", include("summerize.api.urls")),
    
    
     path('docs/',
        include_docs_urls(title='Documentação da API')),
    path('swagger/',
        schema_view.with_ui('swagger', cache_timeout=0),
        name='schema-swagger-ui'),
    path('api/v1/',
        include(routers.DefaultRouter().urls)),
    path('openapi',
        get_schema_view(
            title="API para MedNotes",
            description="API para obter transcrições e resumos de áudios de consulta médica",),
        name='openapi-schema'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
