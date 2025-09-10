import os
import openai
from dotenv import load_dotenv
import json

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

        # -----------------MEDICINA DA DOR-----------------
        # prompt = (
        #     "Você é um assistente que faz prontuários eletronicos.\n"
        #     "Transcrição da consulta:\n\n"
        #     f"{transcript}\n\n"
        #     "O prontuário gerado deve conter os seguintes topicos respectivamente: Nome; Indicação(medico que indicou); Queixa principal; História da moléstia atual; Neuro-psíquico; Sistema locomotor; Estado geral de saúde; Doenças adulto; Outras doenças; Medicações em uso; Hospitalizações, acidentes, traumatismos e cirurgias; Alergias; Imunizações; Historia ocupacional e familiar; Outras drogas; Estilo de vida; Exercicio fisico; Frequência do exercicio; Queixas da vida sexual, sono, intestino"
        #     "Os topicos que não podem ser completos atravez da transcrição devem aparecer como Não informado"
        #     "Todas as informações devem ser tiradas da transcrição da consulta, não invente nenhuma informação"
        #     "O prontuário deve ser escrito em markdown"
        # )
        
        #------------------CIRURGIA------------------
        prompt = f"""
        Você é um assistente que monta prontuários eletrônicos.

        Transcrição da consulta (use SOMENTE estas informações):
        {transcript}

        INSTRUÇÕES GERAIS
        - Escreva em português do Brasil, em **Markdown**.
        - Extraia apenas o que está explícito na transcrição. **Não invente informações**.
        - Se não houver dado suficiente para um tópico, escreva **"Não informado"**.
        - Registre negações quando aparecerem (ex.: "nega alergias", "nega cirurgias").
        - Seja específico e fiel às palavras do paciente/médico. Evite termos vagos.
        - Não inclua seções extras nem comentários sobre o seu raciocínio.

        TOPICOS (ordem e títulos EXATOS abaixo)
        1) Nome
        2) Queixa principal
        3) História da doença atual
        4) Alergia
        5) Doenças associadas
        6) Cirurgias prévias

        FORMATO DE SAÍDA (use exatamente estes cabeçalhos Markdown):
        ### Nome
        <preencha aqui ou "Não informado">

        ### Queixa principal
        <motivo do paciente estar ali; caso nao haja, escreva "Não informado">

        ### História da doença atual
        <tudo relacionado a queixa principal; caso nao haja, escreva "Não informado">

        ### Alergia
        <preencha aqui ou "Não informado">

        ### Doenças associadas
        <liste todas as doenças citadas (podem ou não interferir no tratamento) e inclua tratamentos/medicações atuais quando mencionados; caso não haja, escreva "Não informado">

        ### Cirurgias prévias
        <liste as cirurgias já realizadas; se houver negação explícita, registre; caso contrário, escreva "Não informado">
        """
        
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
