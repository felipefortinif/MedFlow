import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StateService } from '../shared/state.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../shared/api.service';
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
  showGenerate = false;
  canSummarize = false;
  summaryHtml: SafeHtml = '';
  isSummarizing = false;
  backendUrl = 'http://127.0.0.1:8000/';
  voiceScale = 1;
  sessionStartedAt: Date | null = null;
  lastSummaryRaw = '';
  recordingDuration = 0;

  // Gravação em batches
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  // Armazena chunks com timestamp para poder montar janelas sobrepostas
  private timedChunks: { data: BlobPart; time: number }[] = [];
  // Primeiro chunk (contém header EBML do WebM) para reaproveitar nas janelas parciais
  private headerChunk: BlobPart | null = null;
  private batchScheduler: ReturnType<typeof setTimeout> | null = null;
  stopRequested = false;
  isProcessingFinal = false;
  // Configurações do batch
  private readonly batchSize = 25000; // duração da janela (ms)
  private readonly batchOverlap = 5000; // overlap entre janelas (ms)
  private readonly chunkTimeslice = 1000; // intervalo de emissão de ondataavailable (ms)
  private lastBatchSentAt: number | null = null;
  private finalBatchSent = false; // evita envios duplicados após parada
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;
  private analyserFrame: number | null = null;
  private recordingTicker: ReturnType<typeof setInterval> | null = null;

  // Dados
  private fullTranscript = '';

  constructor(
    private state: StateService,
    private cdr: ChangeDetectorRef,
    private api: ApiService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.state.resetTranscript();
  }

  ngOnDestroy(): void {
    this.clearBatchScheduler();
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try { this.mediaRecorder.stop(); } catch { }
    }
    this.flushFinalBatch();
    this.stopStream();
    this.stopRecordingTimer();
  }

  get patientName(): string {
    return this.state.paciente()?.nome ?? 'Paciente';
  }

  get patientCpf(): string | null {
    return this.state.paciente()?.cpf ?? null;
  }

  get patientNascimento(): string | null {
    const nascimento = this.state.paciente()?.nascimento;
    if (!nascimento) return null;
    try {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(nascimento));
    } catch {
      return nascimento;
    }
  }

  get sessionStartedLabel(): string | null {
    if (!this.sessionStartedAt) return null;
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(this.sessionStartedAt);
  }

  get statusChip() {
    if (this.isRecording) {
      return { label: 'Gravando', icon: '🔴', class: 'recording' } as const;
    }
    if (this.isProcessingFinal || this.isSummarizing) {
      return { label: 'Processando', icon: '⏳', class: 'processing' } as const;
    }
    if (this.lastSummaryRaw) {
      return { label: 'Prontuário gerado', icon: '✔️', class: 'success' } as const;
    }
    return { label: 'Pronto para gravar', icon: '🟢', class: 'idle' } as const;
  }

  get recordingDurationLabel(): string {
    const minutes = Math.floor(this.recordingDuration / 60).toString().padStart(2, '0');
    const seconds = (this.recordingDuration % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  startRecording(): void {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream: MediaStream) => {
        this.isRecording = true;
        this.stopRequested = false;
        this.isProcessingFinal = false;
        this.finalBatchSent = false;
        this.status = 'Gravando...';
        this.summaryHtml = '';
        this.lastSummaryRaw = '';
        this.canSummarize = false;
        this.showGenerate = false;
        this.fullTranscript = '';
        this.timedChunks = [];
        this.lastBatchSentAt = null;
        this.sessionStartedAt = new Date();
        this.recordingDuration = 0;
        this.startRecordingTimer();

        this.stream = stream;
        this.startVoiceVisualizer(stream);
        this.startContinuousRecorder(stream);
      })
      .catch(() => {
        this.status = 'Acesso ao microfone negado.';
      });
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.stopRequested = true;
    this.isProcessingFinal = true;
    this.showGenerate = true;
    this.status = 'Processando áudio...';
    this.clearBatchScheduler();
    this.stopVoiceVisualizer();
    this.stopRecordingTimer();
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

  // Inicia um único MediaRecorder contínuo; janelas são geradas por software com overlap
  private startContinuousRecorder(stream: MediaStream): void {
    try {
      // Força mimeType para garantir header consistente
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    } catch {
      this.status = 'MediaRecorder não suportado neste navegador.';
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
      this.status = 'Gravação finalizada.';
      this.stopStream();
      this.stopRecordingTimer();
    };

    try {
      // timeslice faz ondataavailable disparar periodicamente
      this.mediaRecorder.start(this.chunkTimeslice);
      this.lastBatchSentAt = Date.now();
      this.scheduleNextBatchSend();
    } catch {
      this.status = 'Falha ao iniciar o MediaRecorder.';
    }
  }

  private emitBatch(isFinal: boolean) {
    if (this.timedChunks.length === 0) {
      if (isFinal) {
        this.isProcessingFinal = false;
        this.showGenerate = this.canSummarize;
      }
      return;
    }
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
    this.stopVoiceVisualizer();
  }

  private startRecordingTimer() {
    this.stopRecordingTimer();
    this.recordingTicker = setInterval(() => {
      this.recordingDuration += 1;
      try { this.cdr.detectChanges(); } catch { }
    }, 1000);
  }

  private stopRecordingTimer() {
    if (this.recordingTicker) {
      clearInterval(this.recordingTicker);
      this.recordingTicker = null;
    }
  }

  private startVoiceVisualizer(stream: MediaStream) {
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextCtor();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);
      this.analyserData = new Uint8Array(this.analyser.fftSize) as Uint8Array<ArrayBuffer>;
      this.tickVoiceVisualizer();
    } catch (_err) {
      this.voiceScale = 1;
    }
  }

  private tickVoiceVisualizer() {
    if (!this.analyser || !this.analyserData) return;
    this.analyser.getByteTimeDomainData(this.analyserData);
    let sumSquares = 0;
    for (let i = 0; i < this.analyserData.length; i++) {
      const deviation = (this.analyserData[i] - 128) / 128;
      sumSquares += deviation * deviation;
    }
    const rms = Math.sqrt(sumSquares / this.analyserData.length);
    const level = Math.min(rms * 3, 1.4);
    this.voiceScale = 1 + level * 0.8;
    try { this.cdr.detectChanges(); } catch { }
    this.analyserFrame = requestAnimationFrame(() => this.tickVoiceVisualizer());
  }

  private stopVoiceVisualizer() {
    if (this.analyserFrame !== null) {
      cancelAnimationFrame(this.analyserFrame);
      this.analyserFrame = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch { }
      this.audioContext = null;
    }
    this.analyser = null;
    this.analyserData = null;
    this.voiceScale = 1;
  }

  // --------- API ---------

  private async sendAudioBatch(blob: Blob, isFinal = false): Promise<void> {
    if (this.finalBatchSent && !isFinal) return; // aborta envios tardios
    try {
      // Chama o serviço centralizado
      this.api.transcribeBatch(blob).subscribe({
        next: (data) => {
          if (data?.transcript) this.appendTranscript(data.transcript);
          if (isFinal) {
            this.isProcessingFinal = false;
            this.showGenerate = true;
            try { this.cdr.detectChanges(); } catch { }
          }
          this.status = isFinal ? 'Gravação finalizada.' : ' ';
        },
        error: (_err) => {
          if (isFinal) {
            this.isProcessingFinal = false;
            this.showGenerate = this.canSummarize;
          }
          this.status = 'Erro ao enviar lote de áudio.';
        }
      });
    } catch (_err) {
      if (isFinal) {
        this.isProcessingFinal = false;
        this.showGenerate = this.canSummarize;
      }
      this.status = 'Erro ao enviar lote de áudio.';
    }
  }

  private markdownToHtml(md: string): string {
    let html = md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
      .replace(/\*(.*?)\*/gim, '<i>$1</i>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');

    html = html.replace(/^- (.*)$/gim, '<li>$1</li>');
    return html;
  }

  async generateProntuario() {
    const text = this.state.fullTranscript();
    if (!text || this.isSummarizing) return;
    if (this.isRecording && !this.stopRequested) {
      this.stopRecording();
    }
    this.showGenerate = false;
    this.isSummarizing = true;
    this.status = 'Gerando prontuário...';
    this.summaryHtml = '';
    this.lastSummaryRaw = '';
    try {
      const resp = await firstValueFrom(
        this.api.summarizeTranscript(text, this.getCSRFToken())
      );
      if (resp?.summary) {
        const html = this.markdownToHtml(resp.summary);
        this.summaryHtml = this.sanitizer.bypassSecurityTrustHtml(html);
        this.lastSummaryRaw = html;
        this.status = 'Prontuário gerado.';
      } else {
        this.summaryHtml = this.sanitizer.bypassSecurityTrustHtml('Nenhum resumo retornado.');
        this.status = 'Nenhum resumo retornado.';
      }
    } catch (_err) {
      this.summaryHtml = this.sanitizer.bypassSecurityTrustHtml('Erro ao gerar prontuário.');
      this.lastSummaryRaw = '';
      this.status = 'Erro ao gerar prontuário.';
    } finally {
      this.isSummarizing = false;
      try { this.cdr.detectChanges(); } catch { }
    }
  }

  exportSummary() {
    if (!this.lastSummaryRaw) return;
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Prontuário - ${this.patientName}</title></head><body>${this.lastSummaryRaw}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `prontuario-${Date.now()}.html`;
      anchor.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }


}