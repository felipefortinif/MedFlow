import whisper
import numpy as np
import sounddevice as sd
import threading
import time
import msvcrt  # só funciona no Windows

# 1) Configurações
CHUNK_SECONDS  = 10      # tamanho do bloco em segundos
SR         = 16000   # taxa de amostragem (Whisper espera 16 kHz)
LANG       = "pt"    # forçar português

# 2) Carrega o modelo
model = whisper.load_model("medium")

# 3) Buffer compartilhado e flag de parada
audio_buffer = []
stop_listening = False

def audio_callback(indata, frames, time_info, status):
    if status:
        print("⚠️", status)
    audio_buffer.extend(indata[:, 0])

def key_watcher():
    """Roda uma thread em paralelo e marca stop_listening=True quando 'q' for pressionado."""
    global stop_listening
    while True:
        if msvcrt.kbhit():
            key = msvcrt.getch()
            if key.lower() == b'q':
                stop_listening = True
                print("\nℹ️  'q' pressionado: parando a captura do microfone…")
                break
        time.sleep(0.1)

def process_chunk(chunk: np.ndarray, file):
    """Transcreve um pedaço e imprime seus segmentos."""
    result = model.transcribe(chunk, language="pt", fp16=False, temperature=0.0)
    for seg in result["segments"]:
        text = seg["text"].strip()
        file.write(text + "\n")

def main():
    
    # 1) Pergunta metadados antes de iniciar
    paciente = input("Nome do paciente: ").strip()
    data     = input("Data da consulta (DD/MM/AAAA): ").strip()
    horario  = input("Horário da consulta (HH:MM): ").strip()
    header   = f"Paciente: {paciente} | Data: {data} | Horário: {horario}"
    output_file = "../transcricoes.txt"
    
    with open(output_file, "a", encoding="utf-8") as f:
        f.write("\n\n" + header + "\n")
        
        # inicia thread para escutar "q"
        watcher = threading.Thread(target=key_watcher, daemon=True)
        watcher.start()

        print(f"🎙️ Começando captura em blocos de {CHUNK_SECONDS}s. Pressione 'q' para parar.")
        with sd.InputStream(samplerate=SR, channels=1, callback=audio_callback):
            # loop principal: captura até stop_listening virar True
            while not stop_listening:
                if len(audio_buffer) < SR * CHUNK_SECONDS:
                    sd.sleep(100)
                    continue
                # extrai um chunk completo
                chunk = np.array(audio_buffer[: SR * CHUNK_SECONDS], dtype=np.float32)
                del audio_buffer[: SR * CHUNK_SECONDS]
                process_chunk(chunk, f)

        print("🔄 Processando qualquer áudio restante…")
        while len(audio_buffer) > 0:
            length = min(len(audio_buffer), SR * CHUNK_SECONDS)
            chunk = np.array(audio_buffer[:length], dtype=np.float32)
            del audio_buffer[:length]
            process_chunk(chunk, f)

        print(f"✅ Transcrição salva em '{output_file}'")

if __name__ == "__main__":
    main()