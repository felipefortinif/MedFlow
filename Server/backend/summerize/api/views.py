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
        prompt = f"""
        Você é um assistente que monta prontuários eletrônicos.

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
        - Use abreviações comuns (ex.: HAS, DM2, DPOC) quando apropriado.

        TÓPICOS (ordem e títulos EXATOS abaixo)
        1) Nome
        2) Indicação(medico que indicou)
        3) Queixa principal
        4) História da moléstia atual
        5) Neuro-psíquico
        6) Sistema locomotor
        7) Estado geral de saúde
        8) Doenças adulto
        9) Outras doenças
        10) Medicações em uso
        11) Hospitalizações, acidentes, traumatismos e cirurgias
        12) Alergias
        13) Imunizações
        14) Historia ocupacional e familiar
        15) Outras drogas
        16) Estilo de vida
        17) Exercicio fisico
        18) Frequência do exercicio
        19) Queixas da vida sexual, sono, intestino

        FORMATO DE SAÍDA (use exatamente estes cabeçalhos Markdown, nesta ordem)

        ### Nome
        <preencha aqui ou "Não informado">

        ### Indicação(medico que indicou)
        <preencha aqui, use "Dr. Nome" ou "Não informado">

        ### Queixa principal
        <preencha aqui ou "Não informado">

        ### História da moléstia atual
        <preencha aqui ou "Não informado">

        ### Neuro-psíquico
        <preencha aqui ou "Não informado">

        ### Sistema locomotor
        <preencha aqui ou "Não informado">

        ### Estado geral de saúde
        <preencha aqui ou "Não informado">

        ### Doenças adulto
        <liste doenças do adulto citadas; se nenhuma, "Não informado">

        ### Outras doenças
        <liste outras condições mencionadas; se nenhuma, "Não informado">

        ### Medicações em uso
        <liste nome/dose/frequência se mencionados; se nenhuma, "Não informado">

        ### Hospitalizações, acidentes, traumatismos e cirurgias
        <liste eventos relevantes (com data/local se citados); se nega, registre; caso contrário, "Não informado">

        ### Alergias
        <liste alergias e reações; se nega, registre; caso contrário, "Não informado">

        ### Imunizações
        <liste vacinas e datas se citadas; se não houver, "Não informado">

        ### Historia ocupacional e familiar
        <resuma o que for mencionado (trabalho, exposições, antecedentes familiares); se nada constar, "Não informado">

        ### Outras drogas
        <registre uso/negação de álcool, tabaco, ilícitas etc. conforme a transcrição; se nada constar, "Não informado">

        ### Estilo de vida
        <ex.: dieta, rotina, hábitos se citados; se nada constar, "Não informado">

        ### Exercicio fisico
        <tipo, duração, frequência se citados; se nada constar, "Não informado">

        ### Frequência do exercicio
        <detalhe a frequência se mencionada separadamente; caso contrário, "Não informado">

        ### Queixas da vida sexual, sono, intestino
        <registre o que foi dito para cada aspecto; se nada constar, "Não informado">
        """

        
        #------------------CIRURGIA------------------
        # prompt = f"""
        # Você é um assistente que monta prontuários eletrônicos.

        # Transcrição da consulta (use SOMENTE estas informações):
        # {transcript}

        # INSTRUÇÕES GERAIS
        # - Escreva em português do Brasil, em **Markdown**.
        # - Extraia apenas o que está explícito na transcrição. **Não invente informações**.
        # - Se não houver dado suficiente para um tópico, escreva **"Não informado"**.
        # - Registre negações quando aparecerem (ex.: "nega alergias", "nega cirurgias").
        # - Seja específico e fiel às palavras do paciente/médico. Evite termos vagos.
        # - Não inclua seções extras nem comentários sobre o seu raciocínio.

        # TOPICOS (ordem e títulos EXATOS abaixo)
        # 1) Nome
        # 2) Queixa principal
        # 3) História da doença atual
        # 4) Alergia
        # 5) Doenças associadas
        # 6) Cirurgias prévias

        # FORMATO DE SAÍDA (use exatamente estes cabeçalhos Markdown):
        # ### Nome
        # <preencha aqui ou "Não informado">

        # ### Queixa principal
        # <motivo do paciente estar ali; caso nao haja, escreva "Não informado">

        # ### História da doença atual
        # <tudo relacionado a queixa principal; caso nao haja, escreva "Não informado">

        # ### Alergia
        # <preencha aqui ou "Não informado">

        # ### Doenças associadas
        # <liste todas as doenças citadas (podem ou não interferir no tratamento) e inclua tratamentos/medicações atuais quando mencionados; caso não haja, escreva "Não informado">

        # ### Cirurgias prévias
        # <liste as cirurgias já realizadas; se houver negação explícita, registre; caso contrário, escreva "Não informado">
        # """
        
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
