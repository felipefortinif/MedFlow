document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    const nome = (params.get('nome') || '').trim();
    if (!nome) return location.replace('index.html');

    const patientNameEl = document.getElementById('patient-name');
    const recordBtn = document.getElementById('record-btn');
    const statusEl = document.getElementById('status');
    const outputs = document.getElementById('outputs');
    const generateBtn = document.getElementById('generate-btn');

    patientNameEl.textContent = nome;

    let mediaRecorder = null;
    let chunks = [];
    let currentStream = null;

    async function startRecording() {
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(currentStream);
            chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                // Para o microfone
                if (currentStream) {
                    currentStream.getTracks().forEach(t => t.stop());
                    currentStream = null;
                }

                const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
                const url = URL.createObjectURL(blob);

                // Player
                const audio = document.createElement('audio');
                audio.controls = true;
                audio.src = url;

                // Link de download
                const a = document.createElement('a');
                a.href = url;
                a.download = `gravacao-${Date.now()}.webm`;
                a.textContent = 'Baixar gravação';

                const row = document.createElement('div');
                row.className = 'output-row';
                row.appendChild(audio);
                row.appendChild(a);
                outputs.prepend(row);

                recordBtn.textContent = '🎤 Gravar Áudio';
                recordBtn.classList.remove('recording');
                statusEl.textContent = 'Gravação finalizada';

                // Mostra botão "Gerar Prontuário"
                generateBtn.style.display = '';
                // Sempre reatribui o handler para evitar múltiplos listeners
                generateBtn.onclick = () => {
                    const qs = new URLSearchParams({ nome });
                    window.location.href = `prontuario.html?${qs.toString()}`;
                };
            };

            mediaRecorder.start();
            recordBtn.textContent = '⏹️ Parar';
            recordBtn.classList.add('recording');
            statusEl.textContent = 'Gravando...';
        } catch (err) {
            console.error(err);
            statusEl.textContent = 'Permissão negada ou erro no microfone.';
            recordBtn.textContent = '🎤 Gravar Áudio';
            recordBtn.classList.remove('recording');
            if (currentStream) {
                currentStream.getTracks().forEach(t => t.stop());
                currentStream = null;
            }
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    }

    recordBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    });
});
