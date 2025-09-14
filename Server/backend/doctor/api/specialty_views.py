from .serializers import SpecialtiesSerializer
from doctor.models import Specialties

from rest_framework import generics

from rest_framework.response import Response
from rest_framework import status

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
    
