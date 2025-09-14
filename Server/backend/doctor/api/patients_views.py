from .serializers import PatientsSerializer, PatientsListSerializer
from doctor.models import Patients

from rest_framework import generics
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.parsers import JSONParser

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

class PatientsList(generics.ListAPIView):
    queryset = Patients.objects.all()
    serializer_class = PatientsListSerializer
    
    @swagger_auto_schema(
        operation_summary="List patients for the authenticated doctor",
        operation_description="Returns a list of patients associated with the authenticated doctor. Requires token authentication.",
        manual_parameters=[
            openapi.Parameter('Authorization', openapi.IN_HEADER, description="Token <your token>", type=openapi.TYPE_STRING, required=True)
        ],
        responses={
            200: PatientsListSerializer(many=True),
            401: openapi.Response('Unauthorized', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) }))
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
            patients = self.get_queryset().filter(doctor=user)
            serializer = PatientsListSerializer(patients, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

class PatientAPIView(APIView):
    
    @swagger_auto_schema(
        operation_summary="Get a patient by ID",
        operation_description="Retrieve a patient's details by ID. Requires token authentication.",
        manual_parameters=[
            openapi.Parameter('Authorization', openapi.IN_HEADER, description="Token <your token>", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('id', openapi.IN_QUERY, description="Patient ID", type=openapi.TYPE_INTEGER, required=True)
        ],
        responses={
            200: PatientsSerializer(),
            400: openapi.Response('Bad Request', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) })),
            401: openapi.Response('Unauthorized', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) })),
            404: openapi.Response('Not Found', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) }))
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
            
            patient_id = request.query_params.get('id')
            
            if patient_id:
                patient = get_object_or_404(Patients, id=patient_id, doctor=user)
                serializer = PatientsSerializer(patient)
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Patient ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    @swagger_auto_schema(
        operation_summary="Create a new patient",
        operation_description="Create a new patient for the authenticated doctor. Requires token authentication.",
        manual_parameters=[
            openapi.Parameter('Authorization', openapi.IN_HEADER, description="Token <your token>", type=openapi.TYPE_STRING, required=True)
        ],
        request_body=PatientsSerializer,
        responses={
            201: PatientsSerializer(),
            400: openapi.Response('Bad Request', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) })),
            401: openapi.Response('Unauthorized', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) }))
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
        
        serializer = PatientsSerializer(data=data)
        
        if serializer.is_valid():
            
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
    @swagger_auto_schema(
        operation_summary="Update a patient by ID",
        operation_description="Update an existing patient's details by ID. Requires token authentication.",
        manual_parameters=[
            openapi.Parameter('Authorization', openapi.IN_HEADER, description="Token <your token>", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('id', openapi.IN_QUERY, description="Patient ID", type=openapi.TYPE_INTEGER, required=True)
        ],
        request_body=PatientsSerializer,
        responses={
            200: PatientsSerializer(),
            400: openapi.Response('Bad Request', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) })),
            401: openapi.Response('Unauthorized', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) })),
            404: openapi.Response('Not Found', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) }))
        },
        
    )
    def put(self, request):
        try:
            # Extract the token from the Authorization header
            token = request.META.get('HTTP_AUTHORIZATION').split(' ')[1]
            token_obj = Token.objects.get(key=token)
            user = token_obj.user
        except (Token.DoesNotExist, IndexError):
            return Response({'error': 'Invalid or missing token.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            
            patient_id = request.query_params.get('id')
            
            if not patient_id:
                return Response({'error': 'Patient ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
            patient = get_object_or_404(Patients, id=patient_id, doctor=user)
            serializer = PatientsSerializer(patient, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_summary="Delete a patient by ID",
        operation_description="Delete a patient by ID. Requires token authentication.",
        manual_parameters=[
            openapi.Parameter('Authorization', openapi.IN_HEADER, description="Token <your token>", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('id', openapi.IN_QUERY, description="Patient ID", type=openapi.TYPE_INTEGER, required=True)
        ],
        responses={
            204: openapi.Response('Patient deleted successfully', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'message': openapi.Schema(type=openapi.TYPE_STRING) })),
            400: openapi.Response('Bad Request', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) })),
            401: openapi.Response('Unauthorized', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) })),
            404: openapi.Response('Not Found', schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={ 'error': openapi.Schema(type=openapi.TYPE_STRING) }))
        },
        
    )
    def delete(self, request):
        try:
            # Extract the token from the Authorization header
            token = request.META.get('HTTP_AUTHORIZATION').split(' ')[1]
            token_obj = Token.objects.get(key=token)
            user = token_obj.user
        except (Token.DoesNotExist, IndexError):
            return Response({'error': 'Invalid or missing token.'}, status=status.HTTP_401_UNAUTHORIZED)
    
        try:
            patient_id = request.query_params.get('id')
            
            if not patient_id:
                return Response({'error': 'Patient ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
            patient = get_object_or_404(Patients, id=patient_id, doctor=user)
            patient.delete()
            return Response({'message': 'Patient deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    

            