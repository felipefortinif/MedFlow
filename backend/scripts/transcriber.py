import whisper

def wrap_by_words(text: str, max_words: int = 25) -> str:
    words = text.split()
    lines = []
    for i in range(0, len(words), max_words):
        lines.append(" ".join(words[i:i+max_words]))
    return "\n".join(lines)

def main():
    model = whisper.load_model("turbo")

    audio_path = input("Arquivo de áudio (ex: teste.mp3): ").strip()
    paciente   = input("Nome do paciente: ").strip()
    data       = input("Data da consulta (DD/MM/AAAA): ").strip()
    horario    = input("Horário da consulta (HH:MM): ").strip()

    print("\n⏳ Transcrevendo… pode levar alguns segundos.")
    result = model.transcribe(audio_path, language="pt")
    texto = result["text"].strip()


    wrapped_text = wrap_by_words(texto, max_words=30)
    output_file = "transcricoes.txt"
    with open(output_file, "a", encoding="utf-8") as f:
        f.write(f"Paciente: {paciente} | Data: {data} | Horário: {horario}\n")
        f.write(wrapped_text + "\n")
        f.write("\n\n")

    print(f"✅ Transcrição adicionada em `{output_file}`")

if __name__ == "__main__":
    main()
