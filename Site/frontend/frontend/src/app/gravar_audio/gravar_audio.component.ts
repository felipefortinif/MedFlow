import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { StateService } from '../shared/state.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-gravar-audio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gravar_audio.component.html',
  styleUrls: ['./gravar_audio.component.css']
})
export class GravarAudioComponent implements OnInit, OnDestroy {
  status = 'Pronto para gravar';
  isRecording = false;
  transcript = '';
  showGenerate = false;

  // Gravação em batches
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: BlobPart[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private stopRequested = false;

  constructor(private api: ApiService, private state: StateService, private router: Router) {}

  ngOnInit(): void {
    this.transcript = '';
    this.state.resetTranscript();
  }

  ngOnDestroy(): void {
    this.clearBatchTimer();
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.stopStream();
  }

  get patientName(): string {
    return this.state.paciente()?.nome ?? 'Paciente';
  }

  async startRecording() {
    if (this.isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.isRecording = true;
      this.stopRequested = false;
      this.status = 'Gravando...';
      this.showGenerate = false;
      this.transcript = '';
      this.state.resetTranscript();

      this.stream = stream;
      this.startRecorderForBatch(stream);
    } catch (_e) {
      this.status = 'Permissão do microfone negada.';
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.stopRequested = true;
    this.mediaRecorder.stop();
  }

  private startBatchTimer() {
    this.clearBatchTimer();
    // encerra o batch atual após 10s
    this.batchTimer = setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop(); // dispara onstop/ondataavailable
      }
    }, 10000);
  }

  private clearBatchTimer() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  async generateProntuario() {
    const text = this.state.fullTranscript();
    if (!text) return;
    this.router.navigateByUrl('/prontuario');
  }

  // Inicia um MediaRecorder para um batch e, ao finalizar, envia ao backend
  private startRecorderForBatch(stream: MediaStream): void {
    try {
      this.mediaRecorder = new MediaRecorder(stream);
    } catch (_e) {
      this.status = 'MediaRecorder não suportado neste navegador.';
      return;
    }

    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstart = () => {
      this.startBatchTimer();
    };

    this.mediaRecorder.onstop = async () => {
      this.clearBatchTimer();
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];

      // guarda último áudio completo do batch
      this.state.setLastAudio(audioBlob);

      // envia batch para transcrição
      try {
        const resp = await firstValueFrom(this.api.transcribeBatch(audioBlob));
        if (resp?.transcript) {
          this.state.appendTranscript(resp.transcript);
          this.transcript = this.state.fullTranscript();
        }
      } catch (e) {
        console.error('Erro ao transcrever batch', e);
      }

      if (!this.stopRequested) {
        // inicia novo batch
        this.startRecorderForBatch(stream);
      } else {
        // finalizou gravação
        this.isRecording = false;
        this.status = 'Gravação finalizada';
        this.showGenerate = true;
        this.stopStream();
      }
    };

    try {
      this.mediaRecorder.start();
      this.startBatchTimer();
    } catch (_e) {
      this.status = 'Falha ao iniciar gravação.';
    }
  }

  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}
