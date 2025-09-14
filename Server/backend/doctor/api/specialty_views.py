from .serializers import SpecialtiesSerializer
from doctor.models import Specialties

from django.utils.text import slugify

from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User

from rest_framework import generics

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.parsers import JSONParser

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi


class SpecialtiesList(generics.ListAPIView):
    queryset = Specialties.objects.all()
    serializer_class = SpecialtiesSerializer
    
    @swagger_auto_schema(
        operation_summary="List all specialties",
        operation_description="Returns a list of all specialties",
        responses={
            status.HTTP_200_OK: SpecialtiesSerializer(many=True),
        },
    )
    def list(self, request):
        queryset = self.get_queryset()
        serializer = SpecialtiesSerializer(queryset, many=True)
        return Response(serializer.data)
    
