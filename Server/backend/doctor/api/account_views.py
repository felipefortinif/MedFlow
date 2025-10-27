from .serializers import DoctorProfileSerializer
from rest_framework.views import APIView
from doctor.models import Profile
from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework import status

from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth import login
from django.contrib.auth import logout

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi



class CustomAuthToken(ObtainAuthToken):
    
    @swagger_auto_schema(
        operation_summary='Obter o token de autenticação',
        operation_description='Retorna o token em caso de sucesso na autenticação ou HTTP 401',
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'email': openapi.Schema(type=openapi.TYPE_STRING),
                'password': openapi.Schema(type=openapi.TYPE_STRING),
            },
            required=['email', 'password'],
        ),
        responses={
            status.HTTP_200_OK: 'Token is returned.',
            status.HTTP_401_UNAUTHORIZED: 'Unauthorized request.',
    },
)
    def post(self, request, *args, **kwargs):

            data = request.data
            data['username'] = data.get('email', '')
            serializer = self.serializer_class(data=request.data, context={'request': request})
            try:
                if serializer.is_valid():
                    username = serializer.validated_data['username']
                    password = serializer.validated_data['password']
                    user = authenticate(request, username=username, password=password)
                    if user is not None:
                        token, _ = Token.objects.get_or_create(user=user)
                        login(request, user)
                        return Response({'token': token.key})
                    else:
                        return Response({'msg': 'user not found.'}, status=status.HTTP_401_UNAUTHORIZED)
                else:
                    return Response(serializer.errors, status=status.HTTP_403_FORBIDDEN)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            # return Response({'msg': 'Login ou Senha Inválidos.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    @swagger_auto_schema(
        operation_summary='Obtém o email do usuário',
        operation_description="Retorna o email do usuário ou apenas visitante se o usuário não estiver autenticado",
        security=[{'Token':[]}],
        manual_parameters=[
            openapi.Parameter(
                'Authorization',
                openapi.IN_HEADER,
                type=openapi.TYPE_STRING,
                description='Token de autenticação no formato "token \<<i>valor do token</i>\>"',
                default='token ',
            ),
        ],
        responses={
            200: openapi.Response(
                description='Email do usuário',
                schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={'email': openapi.Schema(type=openapi.TYPE_STRING)},
                ),
            )
        }
    )
    def get(self, request):
        '''
        Parâmetros: o token de acesso
        Retorna: o email ou 'visitante'
        '''
        try:
            token = request.META.get('HTTP_AUTHORIZATION').split(' ')[1] # token
            token_obj = Token.objects.get(key=token)
            user = token_obj.user
            return Response(
                {'user': user.email},
                status=status.HTTP_200_OK)
        except (Token.DoesNotExist, AttributeError):
            return Response(
            {'user': 'visitante'},
            status=status.HTTP_404_NOT_FOUND)
    
    @swagger_auto_schema(
        operation_description='Realiza logout do usuário, apagando o seu token',
        operation_summary='Realiza logout',
        security=[{'Token':[]}],
        manual_parameters=[
            openapi.Parameter('Authorization', openapi.IN_HEADER,
            type=openapi.TYPE_STRING, default='token ',
            description='Token de autenticação no formato "token \<<i>valor do token</i>\>"',
            ),
        ],
        request_body=None,
        responses={
                status.HTTP_200_OK: 'User logged out',
                status.HTTP_400_BAD_REQUEST: 'Bad request',
                status.HTTP_401_UNAUTHORIZED: 'User not authenticated',
                status.HTTP_403_FORBIDDEN: 'User not authorized to logout',
                status.HTTP_500_INTERNAL_SERVER_ERROR: 'Erro no servidor',
            },
        )
    def delete(self, request):
        try:
            token = request.META.get('HTTP_AUTHORIZATION').split(' ')[1]
            token_obj = Token.objects.get(key=token)
        except (Token.DoesNotExist, IndexError):
            return Response({'msg': 'Token não existe.'}, status=status.HTTP_400_BAD_REQUEST)
        user = token_obj.user
        if user.is_authenticated:
            request.user = user
            logout(request)
            token = Token.objects.get(user=user)
            token.delete()
            return Response({'msg': 'Logout bem-sucedido.'},
                            status=status.HTTP_200_OK)
        else:
            return Response({'msg': 'Usuário não autenticado.'},
                            status=status.HTTP_403_FORBIDDEN)

    @swagger_auto_schema(
        operation_description='Troca a senha do usuário, atualiza o token em caso de sucesso',
        operation_summary='Troca a senha do usuário',
        manual_parameters=[
            openapi.Parameter(
                'Authorization',
                openapi.IN_HEADER,
                type=openapi.TYPE_STRING,
                description='Token de autenticação no formato "token \<<i>valor do token</i>\>"',
                default='token ',
            ),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'old_password': openapi.Schema(type=openapi.TYPE_STRING),
                'new_password1': openapi.Schema(type=openapi.TYPE_STRING),
                'new_password2': openapi.Schema(type=openapi.TYPE_STRING),
            },
            required=['old_password', 'new_password1', 'new_password2'],
        ),
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Senha alterada com sucesso.",
                examples={ "application/json": { "message": "Senha alterada com sucesso." } }
            ),
            status.HTTP_400_BAD_REQUEST: openapi.Response(
                description="Erro na solicitação.",
                examples={ "application/json": { "old_password": ["Senha atual incorreta."] } }
            ),
        }
    )
    def put(self, request):
        token = request.META.get('HTTP_AUTHORIZATION').split(' ')[1] # token
        token_obj = Token.objects.get(key=token)
        user = token_obj.user
        oldPassword = request.data.get('old_password')
        newPassword = request.data.get('new_password1')
        confirmPassword = request.data.get('new_password2')
        
        if newPassword != confirmPassword:
            return Response({'error': 'New passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar se a senha atual está correta
        if user.check_password(oldPassword):
        # Alterar a senha e atualizar o token
            user.set_password(newPassword)
            user.save()
            # Atualizar token
            try:
                token = Token.objects.get(user=user)
                token.delete()
                token, _ = Token.objects.get_or_create(user=user)
            except Token.DoesNotExist:
                pass
            return Response({'token': token.key, "message": "Senha alterada com sucesso."},
                            status=status.HTTP_200_OK)
        else:
            return Response({"old_password": ["Senha atual incorreta."]}, status=status.HTTP_400_BAD_REQUEST)
        

class AccountAPI(APIView):
    """
    API to register a new Doctor and his/her profile.
    """
    @swagger_auto_schema(
        operation_summary="Register a new Doctor´s profile",
        operation_description="Creates a new user and associated doctor profile.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["password", "email", "cpf", "crm", "specialty"],
            properties={
                
                "password": openapi.Schema(type=openapi.TYPE_STRING, description="Password for the doctor"),
                "first_name": openapi.Schema(type=openapi.TYPE_STRING, description="First name"),
                "last_name": openapi.Schema(type=openapi.TYPE_STRING, description="Last name"),
                "email": openapi.Schema(type=openapi.TYPE_STRING, format="email", description="Email address"),
                "cpf": openapi.Schema(type=openapi.TYPE_STRING, description="CPF number"),
                "date_of_birth": openapi.Schema(type=openapi.TYPE_STRING, format="date", description="Date of birth"),
                # "photo": openapi.Schema(type=openapi.TYPE_STRING, description="Photo (URL or base64)"),
                "phone": openapi.Schema(type=openapi.TYPE_STRING, description="Phone number"),
                "crm": openapi.Schema(type=openapi.TYPE_STRING, description="CRM number"),
                "specialty": openapi.Schema(type=openapi.TYPE_INTEGER, description="Specialty ID"),
            },
        ),
        responses={
            status.HTTP_201_CREATED: openapi.Response(
                description="Doctor profile created successfully.",
                examples={"application/json": {"message": "Doctor profile created successfully."}}
            ),
            status.HTTP_400_BAD_REQUEST: openapi.Response(
                description="Invalid input or error.",
                examples={"application/json": {"error": "Password, and email are required."}}
            ),
        },
    )
    def post(self, request):
        """
        Create a new Doctor and his/her profile.
        """
        # Extract user data from the request
        user_data = {
            
            'password': request.data.get('password'),
            'email': request.data.get('email'),
        }

        # Validate required fields
        if not all(user_data.values()):
            return Response({"error": "Email and Password are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Create the user
            user = User.objects.create_user(
                
                password=user_data['password'],
                email=user_data['email'],
                username=user_data['email'],
                first_name=request.data.get('first_name'),
                last_name=request.data.get('last_name'),
            )

            # Create a profile for the Doctor (if profile-specific data is provided)
            profile_data = {
                
                'id': user.id,
                'cpf': request.data.get('cpf'),
                'date_of_birth': request.data.get('date_of_birth'),
                # 'photo': request.data.get('photo'),
                'phone': request.data.get('phone'),
                'crm': request.data.get('crm'),
                'specialty': request.data.get('specialty'),
            }
            serializer = DoctorProfileSerializer(data=profile_data)
            if serializer.is_valid():
                serializer.save(user=user)

                return Response({"message": "Doctor profile created successfully."}, status=status.HTTP_201_CREATED)
            else:
                user.delete()
                return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        operation_summary="Get authenticated user's profile",
        operation_description="Returns the authenticated doctor's profile.",
        manual_parameters=[
            openapi.Parameter(
                'Authorization', openapi.IN_HEADER, description='Token in format "Token <token>"', type=openapi.TYPE_STRING, required=True
            ),
        ],
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="User data",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'first_name': openapi.Schema(type=openapi.TYPE_STRING),
                        'last_name': openapi.Schema(type=openapi.TYPE_STRING),
                        'profile': openapi.Schema(type=openapi.TYPE_OBJECT, description="Doctor profile", properties={
                            'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'user': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'email': openapi.Schema(type=openapi.TYPE_STRING),
                            'cpf': openapi.Schema(type=openapi.TYPE_STRING),
                            'date_of_birth': openapi.Schema(type=openapi.TYPE_STRING, format="date"),
                            # 'photo': openapi.Schema(type=openapi.TYPE_STRING),
                            'phone': openapi.Schema(type=openapi.TYPE_STRING),
                            'crm': openapi.Schema(type=openapi.TYPE_STRING),
                            'specialty': openapi.Schema(type=openapi.TYPE_INTEGER),
                        })
                    }
                )
            ),
            status.HTTP_400_BAD_REQUEST: openapi.Response(
                description="Token does not exist.",
                examples={"application/json": {"msg": "Token não existe."}}
            ),
            status.HTTP_401_UNAUTHORIZED: openapi.Response(
                description="User not authenticated.",
                examples={"application/json": {"msg": "Usuário não autenticado."}}
            ),
        },
    )
    def get(self, request):
        try:
            token = request.META.get('HTTP_AUTHORIZATION').split(' ')[1]
            token_obj = Token.objects.get(key=token)
        except (Token.DoesNotExist, IndexError):
            return Response({'msg': 'Token não existe.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = token_obj.user
        
        if user.is_authenticated:
            # Retrieve the user's profile
            try:
                profile = Profile.objects.get(user=user)
                profile_data = DoctorProfileSerializer(profile).data
            except Profile.DoesNotExist:
                profile_data = None

            # Return user and profile details if authenticated
            user_data = {
                'id': user.id,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'profile': profile_data  # Include profile details
            }
            return Response(user_data, status=status.HTTP_200_OK)
        else:
            # Return an error if the user is not authenticated
            return Response({'msg': 'Usuário não autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    @swagger_auto_schema(
        operation_summary="Update authenticated user's profile",
        operation_description="Updates the authenticated user's data. Note: email cannot be updated as it is the primary key.",
        manual_parameters=[
            openapi.Parameter(
                'Authorization', openapi.IN_HEADER, description='Token in format "Token <token>"', type=openapi.TYPE_STRING, required=True
            ),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "first_name": openapi.Schema(type=openapi.TYPE_STRING),
                "last_name": openapi.Schema(type=openapi.TYPE_STRING),
                "date_of_birth": openapi.Schema(type=openapi.TYPE_STRING, format="date"),
                # "photo": openapi.Schema(type=openapi.TYPE_STRING),
                "phone": openapi.Schema(type=openapi.TYPE_STRING),
                "crm": openapi.Schema(type=openapi.TYPE_STRING),
                "specialty": openapi.Schema(type=openapi.TYPE_INTEGER),
                "cpf": openapi.Schema(type=openapi.TYPE_STRING),
            },
        ),
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="User updated successfully.",
                examples={"application/json": {"msg": "Usuário atualizado com sucesso."}}
            ),
            status.HTTP_400_BAD_REQUEST: openapi.Response(
                description="Error updating profile.",
                examples={"application/json": {"msg": "Erro ao atualizar perfil: ..."}}
            ),
            status.HTTP_401_UNAUTHORIZED: openapi.Response(
                description="User not authenticated.",
                examples={"application/json": {"msg": "Usuário não autenticado."}}
            ),
        },
    )
    def put(self, request):
        try:
            # Extract the token from the Authorization header
            token = request.META.get('HTTP_AUTHORIZATION').split(' ')[1]
            token_obj = Token.objects.get(key=token)
        except (Token.DoesNotExist, IndexError):
            return Response({'msg': 'Token não existe.'}, status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user

        if user.is_authenticated:
            # Update user fields (email is NOT updatable as it's the PK)
            user.first_name = request.data.get('first_name', user.first_name)
            user.last_name = request.data.get('last_name', user.last_name)
            user.save()

            # Update profile fields if provided
            try:
                profile = Profile.objects.get(user=user)
                serializer = DoctorProfileSerializer(profile, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response({'msg': 'Usuário atualizado com sucesso.'}, status=status.HTTP_200_OK)
                else:
                    return Response({'msg': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            except Profile.DoesNotExist:
                return Response({'msg': 'Perfil não encontrado.'}, status=status.HTTP_400_BAD_REQUEST)

            
        else:
            return Response({'msg': 'Usuário não autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)
        
    @swagger_auto_schema(
        operation_summary="Delete authenticated user and profile",
        operation_description="Deletes the authenticated user's profile.",
        manual_parameters=[
            openapi.Parameter(
                'Authorization', openapi.IN_HEADER, description='Token in format "Token <token>"', type=openapi.TYPE_STRING, required=True
            ),
        ],
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="User and profile deleted successfully.",
                examples={"application/json": {"msg": "Usuário e perfil excluídos com sucesso."}}
            ),
            status.HTTP_400_BAD_REQUEST: openapi.Response(
                description="Token does not exist or error deleting user.",
                examples={"application/json": {"msg": "Token não existe."}}
            ),
            status.HTTP_401_UNAUTHORIZED: openapi.Response(
                description="User not authenticated.",
                examples={"application/json": {"msg": "Usuário não autenticado."}}
            ),
        },
    )
    def delete(self, request):
        try:
            # Extract the token from the Authorization header
            token = request.META.get('HTTP_AUTHORIZATION').split(' ')[1]
            token_obj = Token.objects.get(key=token)
        except (Token.DoesNotExist, IndexError):
            return Response({'msg': 'Token não existe.'}, status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user

        if user.is_authenticated:
            # Delete user and associated profile
            try:
                Profile.objects.filter(user=user).delete()
                user.delete()
                return Response({'msg': 'Usuário e perfil excluídos com sucesso.'}, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({'msg': f'Erro ao excluir usuário: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'msg': 'Usuário não autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)