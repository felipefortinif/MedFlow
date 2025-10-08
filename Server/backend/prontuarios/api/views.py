from .serializers import ProntuariosSerializer
from doctor.models import Patients
from prontuarios.models import Prontuarios

from rest_framework import generics
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
    
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.shortcuts import get_object_or_404

class ProntuariosList(generics.ListAPIView):
    queryset = Prontuarios.objects.all()
    serializer_class = ProntuariosSerializer

    @swagger_auto_schema(
        operation_summary="List prontuários for the authenticated doctor (by patient)",
        operation_description=(
            "Returns a list of prontuários for the given patient, restricted to the "
            "authenticated doctor. Requires token authentication and the `patient_id` "
            "query parameter."
        ),
        manual_parameters=[
            openapi.Parameter(
                'Authorization',
                openapi.IN_HEADER,
                description="Token <your token>",
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'patient_id',
                openapi.IN_QUERY,
                description="ID do paciente pertencente ao médico autenticado",
                type=openapi.TYPE_INTEGER,
                required=True
            ),
        ],
        responses={
            200: ProntuariosSerializer(many=True),
            400: openapi.Response(
                'Bad Request',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={'error': openapi.Schema(type=openapi.TYPE_STRING)}
                )
            ),
            401: openapi.Response(
                'Unauthorized',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={'error': openapi.Schema(type=openapi.TYPE_STRING)}
                )
            ),
        },
    )
    def get(self, request):
        
        try:
            token = request.META.get('HTTP_AUTHORIZATION').split(' ')[1]
            token_obj = Token.objects.get(key=token)
            user = token_obj.user
        except (Token.DoesNotExist, IndexError):
            return Response({'error': 'Invalid or missing token.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            patient_id = request.query_params.get('patient_id')
            
            if patient_id:
                patient_id = int(patient_id)
                patient = get_object_or_404(Patients, id=patient_id, doctor=user)
            else:
                return Response({'error': 'patient_id query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

            prontuarios = self.get_queryset().filter(doctor=user, patient=patient_id).order_by('-created_at')
            serializer = ProntuariosSerializer(prontuarios, many=True, context={'include_created_at': True})
            # serializer = ProntuariosSerializer(prontuarios, context={"include_created_at": True})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
class ProntuariosAPIView(APIView):
    """
    API View to handle Prontuarios.
    """

    @swagger_auto_schema(
        operation_summary="Create a prontuário for the authenticated doctor",
        operation_description=(
            "Creates a new prontuário associated with the authenticated doctor. "
            "Requires token authentication. The request body must follow the "
            "`ProntuariosSerializer` schema. The `doctor` field is set automatically "
            "from the token and does not need to be provided."
        ),
        manual_parameters=[
            openapi.Parameter(
                'Authorization',
                openapi.IN_HEADER,
                description="Token <your token>",
                type=openapi.TYPE_STRING,
                required=True
            ),
        ],
        request_body=ProntuariosSerializer,
        responses={
            201: ProntuariosSerializer,
            400: openapi.Response(
                'Bad Request (validation errors)',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    # Ex.: {"field_name": ["error msg 1", "error msg 2"], "non_field_errors": ["..."]}
                    additional_properties=openapi.Schema(
                        type=openapi.TYPE_ARRAY,
                        items=openapi.Items(type=openapi.TYPE_STRING)
                    )
                )
            ),
            401: openapi.Response(
                'Unauthorized',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={'error': openapi.Schema(type=openapi.TYPE_STRING)}
                )
            ),
        },
    )
    def post(self, request):
        
        try:
            # Extract the token from the Authorization header
            token = request.META.get('HTTP_AUTHORIZATION').split(' ')[1]
            token_obj = Token.objects.get(key=token)
            user = token_obj.user
        except (Token.DoesNotExist, IndexError):
            return Response({'error': 'Invalid or missing token.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        data = request.data.copy()
        data['doctor'] = user.id
        serializer = ProntuariosSerializer(data=data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        operation_summary="Retrieve the latest prontuário for a patient",
        operation_description=(
            "Returns the most recent prontuário (medical record) for a specific patient "
            "associated with the authenticated doctor. Requires token authentication and "
            "the `patient_id` query parameter."
        ),
        manual_parameters=[
            openapi.Parameter(
                'Authorization',
                openapi.IN_HEADER,
                description="Token <your token>",
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'patient_id',
                openapi.IN_QUERY,
                description="ID do paciente pertencente ao médico autenticado",
                type=openapi.TYPE_INTEGER,
                required=True
            ),
        ],
        responses={
            200: ProntuariosSerializer,
            400: openapi.Response(
                'Bad Request',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={'error': openapi.Schema(type=openapi.TYPE_STRING)}
                )
            ),
            401: openapi.Response(
                'Unauthorized',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={'error': openapi.Schema(type=openapi.TYPE_STRING)}
                )
            ),
            404: openapi.Response(
                'Not Found',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={'error': openapi.Schema(type=openapi.TYPE_STRING)}
                )
            ),
        },
    )
    def get(self, request):
        
        try:
                # Extract the token from the Authorization header
                token = request.META.get('HTTP_AUTHORIZATION').split(' ')[1]
                token_obj = Token.objects.get(key=token)
                user = token_obj.user
        except (Token.DoesNotExist, IndexError):
            return Response({'error': 'Invalid or missing token.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
        try:
            
            patient_id = request.query_params.get('patient_id')
            
            if patient_id:
                patient_id = int(patient_id)
                patient = get_object_or_404(Patients, id=patient_id, doctor=user)
            else:
                return Response({'error': 'patient_id query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

            prontuario = Prontuarios.objects.filter(doctor=user, patient=patient_id).first()
            if prontuario:
                serializer = ProntuariosSerializer(prontuario)
                serializer = ProntuariosSerializer(prontuario, context={"include_created_at": True})
                return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Prontuarios.DoesNotExist:
            return Response({'error': 'prontuario not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
