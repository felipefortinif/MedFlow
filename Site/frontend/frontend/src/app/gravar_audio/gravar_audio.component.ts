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
  // Armazena chunks com timestamp para poder montar janelas sobrepostas
  private timedChunks: { data: BlobPart; time: number }[] = [];
  // Primeiro chunk (contém header EBML do WebM) para reaproveitar nas janelas parciais
  private headerChunk: BlobPart | null = null;
  private batchScheduler: ReturnType<typeof setTimeout> | null = null;
  private stopRequested = false;
  // Configurações do batch
  private readonly batchSize = 25000; // duração da janela (ms)
  private readonly batchOverlap = 5000; // overlap entre janelas (ms)
  private readonly chunkTimeslice = 1000; // intervalo de emissão de ondataavailable (ms)
  private lastBatchSentAt: number | null = null;
  private finalBatchSent = false; // evita envios duplicados após parada
  private navigating = false; // evita atividade durante navegação

  // Dados
  private fullTranscript = '';

  constructor(private state: StateService, private router: Router, private cdr: ChangeDetectorRef, private api: ApiService) { }

  ngOnInit(): void {
    this.transcriptText = '';
    this.state.resetTranscript();
  }

  ngOnDestroy(): void {
  this.clearBatchScheduler();
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try { this.mediaRecorder.stop(); } catch { }
    }
    this.flushFinalBatch();
    this.stopStream();
  }

  get patientName(): string {
    return this.state.paciente()?.nome ?? 'Paciente';
  }

  startRecording(): void {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream: MediaStream) => {
        this.isRecording = true;
        this.stopRequested = false;
        this.finalBatchSent = false;
        this.navigating = false;
        this.statusText = 'Recording...';
        this.transcriptText = 'Transcript will appear here...';
        this.summaryHtml = '';
        this.canSummarize = false;
        this.showGenerate = false;
        this.fullTranscript = '';
        this.timedChunks = [];
        this.lastBatchSentAt = null;

        this.stream = stream;
        this.startContinuousRecorder(stream);
      })
      .catch(() => {
        this.statusText = 'Microphone access denied.';
      });
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.stopRequested = true;
    this.clearBatchScheduler();
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try { this.mediaRecorder.stop(); } catch { }
    }
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

  private scheduleNextBatchSend() {
    this.clearBatchScheduler();
    const interval = this.batchSize - this.batchOverlap; // avanço da janela
    this.batchScheduler = setTimeout(() => {
      if (!this.stopRequested && !this.finalBatchSent) {
        this.emitBatch(false);
      }
      if (!this.stopRequested && !this.finalBatchSent) {
        this.scheduleNextBatchSend();
      }
    }, interval);
  }

  private clearBatchScheduler() {
    if (this.batchScheduler) {
      clearTimeout(this.batchScheduler);
      this.batchScheduler = null;
    }
  }

  async generateProntuario() {
    const text = this.state.fullTranscript();
    if (!text) return;
    // Garante parada da gravação antes de navegar
    if (this.isRecording && !this.stopRequested) {
        this.stopRecording();
    }
    this.navigating = true;
    this.router.navigateByUrl('/prontuario');
  }

  // Inicia um único MediaRecorder contínuo; janelas são geradas por software com overlap
  private startContinuousRecorder(stream: MediaStream): void {
    try {
      // Força mimeType para garantir header consistente
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    } catch {
      this.statusText = 'MediaRecorder not supported in this browser.';
      return;
    }

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      // Guarda header apenas no primeiro chunk
      if (!this.headerChunk) {
        this.headerChunk = e.data;
      }
      this.timedChunks.push({ data: e.data, time: Date.now() });
      // Limpa chunks antigos (fora da janela máxima que precisamos reconstituir)
      const cutoff = Date.now() - this.batchSize - 2000; // margem extra
      this.timedChunks = this.timedChunks.filter(c => c.time >= cutoff);
    };

    this.mediaRecorder.onstop = () => {
      // Ao parar, envia batch final se houver algo
      this.emitBatch(true);
      this.isRecording = false;
      this.statusText = 'Recording stopped.';
      this.stopStream();
    };

    try {
      // timeslice faz ondataavailable disparar periodicamente
      this.mediaRecorder.start(this.chunkTimeslice);
      this.lastBatchSentAt = Date.now();
      this.scheduleNextBatchSend();
    } catch {
      this.statusText = 'Failed to start MediaRecorder.';
    }
  }

  private emitBatch(isFinal: boolean) {
    if (this.timedChunks.length === 0) return;
    if (this.finalBatchSent) return; // já finalizado
    const now = Date.now();
    if (!isFinal) {
      // Queremos uma janela de batchSize ms terminando em now
      const windowStart = now - this.batchSize;
      const windowChunks = this.timedChunks.filter(c => c.time >= windowStart);
      if (windowChunks.length === 0) return;
      const parts = this.headerChunk ? [this.headerChunk, ...windowChunks.map(c => c.data)] : windowChunks.map(c => c.data);
      const blob = new Blob(parts, { type: 'audio/webm' });
      this.sendAudioBatch(blob, false);
      this.lastBatchSentAt = now;
    } else {
      // Final: envia tudo restante (já inclui overlap último)
      const parts = this.headerChunk ? [this.headerChunk, ...this.timedChunks.map(c => c.data)] : this.timedChunks.map(c => c.data);
      const blob = new Blob(parts, { type: 'audio/webm' });
      this.sendAudioBatch(blob, true);
      this.finalBatchSent = true;
    }
  }

  private flushFinalBatch() {
    if (!this.stopRequested || this.finalBatchSent) return;
    this.emitBatch(true);
  }

  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  // --------- API ---------

  private async sendAudioBatch(blob: Blob, isFinal = false): Promise<void> {
    if (this.finalBatchSent && !isFinal) return; // aborta envios tardios
    if (this.navigating && !isFinal) return;
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