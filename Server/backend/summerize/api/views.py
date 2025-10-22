import os
import openai
from dotenv import load_dotenv
import json
from pathlib import Path

from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.parsers import JSONParser

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .serializer import SummarizeTranscriptSerializer

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("A variável OPENAI_API_KEY não foi carregada.")
openai.api_key = api_key

# Load prontuario templates
TEMPLATES_PATH = Path(__file__).parent / 'prontuario_templates.json'
with open(TEMPLATES_PATH, 'r', encoding='utf-8') as f:
    PRONTUARIO_TEMPLATES = json.load(f)


class SummarizeTranscriptAPIView(APIView):
    """
    post:
    Summarize a transcript into a structured medical record in markdown format.
    """
    @swagger_auto_schema(
        operation_description="Summarize a transcript into a structured medical record in markdown format.",
        request_body=SummarizeTranscriptSerializer,
        responses={
            200: openapi.Response(
                description="Summary generated successfully.",
                examples={"application/json": {"summary": "Resumo em markdown."}}
            ),
            400: openapi.Response(
                description="Bad request.",
                examples={"application/json": {"error": "No transcript provided."}}
            ),
            404: openapi.Response(
                description="Template not found.",
                examples={"application/json": {"error": "Specialty template not found."}}
            ),
            500: openapi.Response(
                description="OpenAI error.",
                examples={"application/json": {"error": "OpenAI error: ..."}}
            )
        }
    )
    def post(self, request):
        serializer = SummarizeTranscriptSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        transcript = serializer.validated_data['transcript']
        specialty = serializer.validated_data.get('specialty', 'medicina_da_dor')
        
        # Load template for the specified specialty
        if specialty not in PRONTUARIO_TEMPLATES:
            return Response(
                {'error': f'Specialty "{specialty}" not found. Available: {", ".join(PRONTUARIO_TEMPLATES.keys())}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        template = PRONTUARIO_TEMPLATES[specialty]
        
        # Build general prompt sections
        general_intro = f"""Você é um assistente que monta prontuários eletrônicos.

        Transcrição da consulta (use SOMENTE estas informações):
        {transcript}

        INSTRUÇÕES GERAIS
        - Escreva em português do Brasil, em **Markdown**.
        - Extraia apenas o que está explícito na transcrição. **Não invente informações**.
        - Se não houver dado suficiente para um tópico, escreva **"Não informado"**.
        - Registre negações quando aparecerem (ex.: "nega alergias", "nega cirurgias").
        - Use frases curtas e objetivas, mantendo fidedignidade às palavras do paciente/médico.
        - Onde fizer sentido (listas de doenças, cirurgias, medicações), use itens com "- ".
        - Não inclua seções extras nem comentários sobre seu raciocínio.
        - Se houver datas, mantenha-as como foram ditas; se unidades forem mencionadas, preserve-as.
        - Use termos médicos sempre que possível.
        - Use abreviações comuns, quando apropriado"""
        
        # Build topics section
        topics_section = "\n\nTÓPICOS (ordem e títulos EXATOS abaixo)"
        for idx, topic in enumerate(template['topics'], 1):
            topics_section += f"\n{idx}) {topic}"
        
        # Build output format section
        output_section = f"\n\nFORMATO DE SAÍDA (use exatamente estes cabeçalhos Markdown, nesta ordem)\n\n{template['output_format']}"
        
        # Combine all sections
        prompt = general_intro + topics_section + output_section
        
        try:
            resp = openai.chat.completions.create(
                model="gpt-4.1", 
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=3000
            )
            summary = resp.choices[0].message.content.strip()
        except Exception as e:
            return Response({'error': f'OpenAI error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'summary': summary}, status=status.HTTP_200_OK)
