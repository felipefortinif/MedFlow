import os
import re
import openai

# 1) Configurar chave de API
openai.api_key = os.getenv("MEDNOTES_OPENAI_API_KEY") or input("Insira sua OpenAI API key: ").strip()

# 2) Função para carregar e parsear o arquivo de transcrições
def carregar_transcricoes(path="transcricoes.txt"):
    if not os.path.exists(path):
        print(f"Arquivo '{path}' não encontrado.")
        return []
    raw = open(path, encoding="utf-8").read().strip()
    # Cada entrada separada por duas linhas em branco
    blocos = [b.strip() for b in raw.split("\n\n\n") if b.strip()]
    transcricoes = []
    header_pattern = re.compile(r"^Paciente:\s*(.+?)\s*\|\s*Data:\s*([0-9]{2}/[0-9]{2}/[0-9]{4})\s*\|\s*Horário:\s*([0-9]{2}:[0-9]{2})$", re.MULTILINE)
    for bloco in blocos:
        linhas = bloco.splitlines()
        header = linhas[0]
        m = header_pattern.match(header)
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

# 3) Função para escolher a entrada correta
def selecionar_entrada(transcricoes):
    paciente = input("Nome do paciente: ").strip()
    cand = [t for t in transcricoes if t["paciente"].lower() == paciente.lower()]
    if not cand:
        print("\nNenhuma transcrição encontrada para esse paciente.")
        return None

    if len(cand) > 1:
        datas = sorted({t["data"] for t in cand})
        print("\nSelecione a data:")
        for i,d in enumerate(datas,1): 
            print(f"{i}. {d}")
        escolha = int(input("Escolha o número da data: ")) - 1
        sel_data = datas[escolha]
        cand = [t for t in cand if t["data"] == sel_data]

    if len(cand) > 1:
        horarios = sorted({t["horario"] for t in cand})
        print("\nSelecione o horário:")
        for i,h in enumerate(horarios,1): 
            print(f"{i}. {h}")
        escolha = int(input("Escolha o número do horário: ")) - 1
        sel_h = horarios[escolha]
        cand = [t for t in cand if t["horario"] == sel_h]
    return cand[0]

# 4) Função que chama o OpenAI para gerar o resumo
def gerar_resumo(texto):
    prompt = (
        "Você é um assistente que faz resumos clínicos.\n"
        "A seguir está a transcrição de uma consulta médica.\n"
        "Faça um resumo curto com os principais pontos discutidos, "
        "destacando medicamentos, sintomas, prescrições ou alertas importantes.\n\n"
        f"---\n{texto}\n---\n\nResumo:"
    )
    resp = openai.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role":"user","content": prompt}],
        temperature=0.3,
        max_tokens=300
    )
    return resp.choices[0].message.content.strip()

def main():
    transcricoes = carregar_transcricoes()
    if not transcricoes:
        return

    entrada = selecionar_entrada(transcricoes)
    if not entrada:
        return

    print("\n⏳ Gerando resumo com a OpenAI…\n")
    resumo = gerar_resumo(entrada["texto"])
    print("📋 Resumo da consulta:")
    print(resumo)

if __name__ == "__main__":
    main()
