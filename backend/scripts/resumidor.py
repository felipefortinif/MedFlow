import os
import re
import sys
import openai
import argparse
from dotenv import load_dotenv

load_dotenv()
# 1) Leitura de args
parser = argparse.ArgumentParser(
    description="Gera resumo para uma transcrição já existente"
)
parser.add_argument("paciente", help="Nome do paciente")
parser.add_argument("data",     help="Data da consulta (DD/MM/AAAA)")
parser.add_argument("horario",  help="Horário da consulta (HH:MM)")
parser.add_argument(
    "--file", "-f",
    default="transcricoes.txt",
    help="Caminho para o arquivo de transcrições"
)
args = parser.parse_args()

# 2) Configura API key
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    print("ERRO: defina a variável OPENAI_API_KEY", file=sys.stderr)
    sys.exit(1)

# 3) Carrega e parseia todas as transcrições
def carregar_transcricoes(path):
    if not os.path.exists(path):
        print(f"Arquivo '{path}' não encontrado.", file=sys.stderr)
        sys.exit(1)
    raw = open(path, encoding="utf-8").read().strip()
    blocos = [b.strip() for b in raw.split("\n\n\n") if b.strip()]
    pattern = re.compile(
        r"^Paciente:\s*(.+?)\s*\|\s*Data:\s*([0-9]{2}/[0-9]{2}/[0-9]{4})"
        r"\s*\|\s*Horário:\s*([0-9]{2}:[0-9]{2})$", re.MULTILINE
    )
    transcricoes = []
    for bloco in blocos:
        linhas = bloco.splitlines()
        m = pattern.match(linhas[0])
        if not m:
            continue
        paciente, data, horario = m.groups()
        texto = "\n".join(linhas[1:])
        transcricoes.append({
            "paciente": paciente,
            "data": data,
            "horario": horario,
            "texto": texto
        })
    return transcricoes

tcs = carregar_transcricoes(args.file)

# 4) Filtra sem prompt
matches = [
    t for t in tcs
    if t["paciente"].lower() == args.paciente.lower()
    and t["data"]     == args.data
    and t["horario"]  == args.horario
]
if not matches:
    print("ERRO: transcrição não encontrada.", file=sys.stderr)
    sys.exit(1)
if len(matches) > 1:
    print("ERRO: múltiplas transcrições encontradas; refine os parâmetros.",
          file=sys.stderr)
    sys.exit(1)

texto = matches[0]["texto"]

# 5) Gera resumo via OpenAI
prompt = (
    "Você é um assistente que faz prontuários eletronicos.\n"
    "Transcrição da consulta:\n\n"
    f"{texto}\n\n"
    "O prontuário gerado deve conter os seguintes topicos respectivamente: Nome; Indicação(medico que indicou); Queixa principal; História da moléstia atual; Neuro-psíquico; Sistema locomotor; Estado geral de saúde; Doenças adulto; Outras doenças; Medicações em uso; Hospitalizações, acidentes, traumatismos e cirurgias; Alergias; Imunizações; Historia ocupacional e familiar; Outras drogas; Estilo de vida; Exercicio fisico; Frequência do exercicio; Queixas da vida sexual, sono, intestino"
    "Os topicos que não possam ser completos atravez da transcrição devem aparecer como Não informado"
    "Todas as informações devem ser tiradas da transcrição da consulta, não invente nenhuma informação"
    "O prontuário deve ser escrito em markdown"
)
resp = openai.chat.completions.create(
    model="gpt-4.1-mini",
    messages=[{"role":"user","content":prompt}],
    temperature=0.3,
    max_tokens=3000
)
print(resp.choices[0].message.content.strip())
