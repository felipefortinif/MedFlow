import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { StateService } from '../shared/state.service';
import { SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../shared/api.service';

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
  transcriptText = '';
  showGenerate = false;
  canSummarize = false;
  summaryHtml: SafeHtml = '';
  statusText = '';
  backendUrl = 'http://127.0.0.1:8000/';

  // Gravação em batches
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: BlobPart[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private stopRequested = false;

  // Dados
  private fullTranscript = '';

  constructor(private state: StateService, private router: Router, private cdr: ChangeDetectorRef, private api: ApiService) { }

  ngOnInit(): void {
    this.transcriptText = '';
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

  startRecording(): void {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream: MediaStream) => {
        this.isRecording = true;
        this.stopRequested = false;
        this.statusText = 'Recording...';
        this.transcriptText = 'Transcript will appear here...';
        this.summaryHtml = '';
        this.canSummarize = false;
        this.showGenerate = false;
        this.fullTranscript = '';

        this.stream = stream;
        // inicia o primeiro recorder de batch
        this.startRecorderForBatch(stream);
      })
      .catch((_err) => {
        this.statusText = 'Microphone access denied.';
      });
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.stopRequested = true;
    this.mediaRecorder.stop();
  }

  private getCSRFToken(): string {
    const name = 'csrftoken=';
    const decodedCookie = decodeURIComponent(document.cookie || '');
    const parts = decodedCookie.split(';');
    for (let c of parts) {
      c = c.trim();
      if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
    }
    return '';
  }

  private appendTranscript(text: string): void {
    if (!text) return;
    if (!this.transcriptText || this.transcriptText === 'Transcript will appear here...') {
      this.transcriptText = '';
    }
    this.transcriptText += text + ' ';
    this.fullTranscript += text + ' ';
    // manter StateService sincronizado para outras telas
    try { this.state.appendTranscript(text); } catch (_e) { }
    this.canSummarize = this.fullTranscript.trim().length > 0;
    // Garantir que Angular detecte a mudança mesmo que o evento venha de fora da zona
    try { this.cdr.detectChanges(); } catch (_e) { }
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
    // cria nova instância de MediaRecorder para cada batch (mais robusto em alguns browsers)
    try {
      this.mediaRecorder = new MediaRecorder(stream);
    } catch (e) {
      this.statusText = 'MediaRecorder not supported in this browser.';
      return;
    }

    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = async (e: BlobEvent) => {
      // coletar dados do batch atual
      this.audioChunks.push(e.data);
      const audioBlob = new Blob(this.audioChunks, { type: e.data.type || 'audio/webm' });
      // limpa buffer para próximo batch
      this.audioChunks = [];

      // envia batch para backend; isFinal = stopRequested
      await this.sendAudioBatch(audioBlob, this.stopRequested);

      if (!this.stopRequested) {
        // inicia próximo batch criando um novo MediaRecorder (evita problemas de reinício)
        this.startRecorderForBatch(stream);
      } else {
        // finaliza fluxo
        this.isRecording = false;
        this.statusText = 'Recording stopped.';
        this.stopStream();
      }
    };

    this.mediaRecorder.onstart = () => {
      this.startBatchTimer();
    };

    this.mediaRecorder.onstop = () => {
      this.clearBatchTimer();
      // ondataavailable será chamado logo em seguida contendo o batch atual
    };

    // inicia gravação do batch atual
    try {
      this.mediaRecorder.start();
      this.startBatchTimer();
    } catch (e) {
      this.statusText = 'Failed to start MediaRecorder.';
    }
  }

  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  // --------- API ---------

  private async sendAudioBatch(blob: Blob, isFinal = false): Promise<void> {
    try {
      // Chama o serviço centralizado
      this.api.transcribeBatch(blob).subscribe({
        next: (data) => {
          if (data?.transcript) this.appendTranscript(data.transcript);
          if (isFinal) {
            this.showGenerate = true;
            try { this.cdr.detectChanges(); } catch { }
          }
          this.statusText = isFinal ? 'Recording stopped.' : 'Batch sent!';
        },
        error: (_err) => {
          this.statusText = 'Error sending audio batch.';
        }
      });
    } catch (_err) {
      this.statusText = 'Error sending audio batch.';
    }
  }


}