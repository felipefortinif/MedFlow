from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import os
import openai
from dotenv import load_dotenv
import json

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

@method_decorator(csrf_exempt, name='dispatch')
class SummarizeTranscriptView(View):
    def post(self, request):
        try:
            data = json.loads(request.body.decode('utf-8'))
            transcript = data.get('transcript')
        except Exception:
            return JsonResponse({'error': 'Invalid JSON.'}, status=400)
        if not transcript:
            return JsonResponse({'error': 'No transcript provided.'}, status=400)
        prompt = (
            "Você é um assistente que faz prontuários eletronicos.\n"
            "Transcrição da consulta:\n\n"
            f"{transcript}\n\n"
            "O prontuário gerado deve conter os seguintes topicos respectivamente: Nome; Indicação(medico que indicou); Queixa principal; História da moléstia atual; Neuro-psíquico; Sistema locomotor; Estado geral de saúde; Doenças adulto; Outras doenças; Medicações em uso; Hospitalizações, acidentes, traumatismos e cirurgias; Alergias; Imunizações; Historia ocupacional e familiar; Outras drogas; Estilo de vida; Exercicio fisico; Frequência do exercicio; Queixas da vida sexual, sono, intestino"
            "Os topicos que não podem ser completos atravez da transcrição devem aparecer como Não informado"
            "Todas as informações devem ser tiradas da transcrição da consulta, não invente nenhuma informação"
            "O prontuário deve ser escrito em markdown"
        )
        try:
            resp = openai.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=3000
            )
            summary = resp.choices[0].message.content.strip()
        except Exception as e:
            return JsonResponse({'error': f'OpenAI error: {str(e)}'}, status=500)
        return JsonResponse({'summary': summary})
