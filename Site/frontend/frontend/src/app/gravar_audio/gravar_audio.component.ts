import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StateService } from '../shared/state.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../shared/api.service';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-gravar-audio',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './gravar_audio.component.html',
  styleUrls: ['./gravar_audio.component.css']
})
export class GravarAudioComponent implements OnInit, OnDestroy {
  status = 'Pronto para gravar';
  isRecording = false;
  showRecordUI = false;
  showGenerate = false;
  canSummarize = false;
  summaryHtml: SafeHtml = '';
  isSummarizing = false;
  backendUrl = 'http://127.0.0.1:8000/';
  voiceScale = 1;
  sessionStartedAt: Date | null = null;
  lastSummaryRaw = '';
  lastSummaryMarkdown = '';
  recordingDuration = 0;
  copyFeedback = '';
  isEditingProntuario = false;
  selectedSpecialty = 'medicina_da_dor'; // Default specialty

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
  private copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  // Dados
  private fullTranscript = '';

  // Dispositivos de áudio
  audioInputs: MediaDeviceInfo[] = [];
  selectedDeviceId: string = '';
  private deviceChangeHandler = () => this.refreshAudioDevices();

  constructor(
    private state: StateService,
    private cdr: ChangeDetectorRef,
    private api: ApiService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.state.resetTranscript();
    this.showRecordUI = true;
    // Inicializa lista de microfones e observa mudanças de dispositivos
    this.refreshAudioDevices();
    if (navigator?.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
    }
  }

  ngOnDestroy(): void {
    this.clearBatchScheduler();
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try { this.mediaRecorder.stop(); } catch { }
    }
    this.flushFinalBatch();
    this.stopStream();
    this.stopRecordingTimer();
    this.clearCopyFeedback();
    if (navigator?.mediaDevices?.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
    }
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
    const audioConstraints: MediaStreamConstraints = this.selectedDeviceId
      ? { audio: { deviceId: { exact: this.selectedDeviceId } as any } }
      : { audio: true };
    navigator.mediaDevices.getUserMedia(audioConstraints)
      .then((stream: MediaStream) => {
        this.isRecording = true;
        this.stopRequested = false;
        this.isProcessingFinal = false;
        this.finalBatchSent = false;
        this.status = 'Gravando...';
        this.summaryHtml = '';
        this.lastSummaryRaw = '';
        this.lastSummaryMarkdown = '';
        this.copyFeedback = '';
        this.canSummarize = false;
        this.showRecordUI = true;
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

  // Recarrega a lista de microfones; tenta solicitar permissão para obter labels quando necessário
  async refreshAudioDevices(): Promise<void> {
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let inputs = devices.filter(d => d.kind === 'audioinput');
      // Se labels estiverem vazios, tenta pedir permissão rapidamente para revelá-los
      const hasLabels = inputs.some(d => !!d.label);
      if (!hasLabels) {
        try {
          const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
          tmp.getTracks().forEach(t => t.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          inputs = devices.filter(d => d.kind === 'audioinput');
        } catch {
          // sem permissão, segue com IDs cegos
        }
      }
      this.audioInputs = inputs;
      // Se o selecionado sumiu, volta ao padrão
      if (this.selectedDeviceId && !this.audioInputs.find(d => d.deviceId === this.selectedDeviceId)) {
        this.selectedDeviceId = '';
      }
      if (!this.selectedDeviceId && this.audioInputs.length === 1) {
        this.selectedDeviceId = this.audioInputs[0].deviceId;
      }
      try { this.cdr.detectChanges(); } catch { }
    } catch {
      // silencioso
    }
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
      const request$ = this.api.transcribeBatch(blob).pipe(
        finalize(() => {
          if (isFinal) {
            this.isProcessingFinal = false;
            this.showGenerate = this.showGenerate || this.canSummarize;
            try { this.cdr.detectChanges(); } catch { }
          }
        })
      );

      request$.subscribe({
        next: (data) => {
          if (data?.transcript) this.appendTranscript(data.transcript);
          if (isFinal) {
            this.showGenerate = true;
          }
          this.status = isFinal ? 'Gravação finalizada.' : ' ';
        },
        error: (_err) => {
          this.status = 'Erro ao enviar lote de áudio.';
        }
      });
    } catch (_err) {
      if (isFinal) {
        this.isProcessingFinal = false;
        this.showGenerate = this.canSummarize;
        try { this.cdr.detectChanges(); } catch { }
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
    this.showRecordUI = false;
    this.isSummarizing = true;
    this.status = 'Gerando prontuário...';
    this.summaryHtml = '';
    this.lastSummaryRaw = '';
    this.lastSummaryMarkdown = '';
    this.copyFeedback = '';
    try {
      const resp = await firstValueFrom(
        this.api.summarizeTranscript(text, this.getCSRFToken(), this.selectedSpecialty)
      );
      if (resp?.summary) {
        const html = this.markdownToHtml(resp.summary);
  this.summaryHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  this.lastSummaryRaw = html;
  this.lastSummaryMarkdown = resp.summary.trim();
        this.status = 'Prontuário gerado.';
      } else {
        this.summaryHtml = this.sanitizer.bypassSecurityTrustHtml('Nenhum resumo retornado.');
        this.status = 'Nenhum resumo retornado.';
      }
    } catch (_err) {
      this.summaryHtml = this.sanitizer.bypassSecurityTrustHtml('Erro ao gerar prontuário.');
      this.lastSummaryRaw = '';
      this.lastSummaryMarkdown = '';
      this.status = 'Erro ao gerar prontuário.';
    } finally {
      this.isSummarizing = false;
      try { this.cdr.detectChanges(); } catch { }
    }
  }

  get canCopySummary(): boolean {
    return !!(this.lastSummaryMarkdown?.trim() || this.lastSummaryRaw?.trim());
  }

  async copySummary(): Promise<void> {
    if (!this.canCopySummary) return;
    const textToCopy = this.lastSummaryMarkdown?.trim() || this.extractPlainText(this.lastSummaryRaw);
    if (!textToCopy) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        this.fallbackCopy(textToCopy);
      }
      this.status = 'Prontuário copiado para a área de transferência.';
      this.showCopyFeedback('Copiado!');
    } catch {
      try {
        this.fallbackCopy(textToCopy);
        this.status = 'Prontuário copiado para a área de transferência.';
        this.showCopyFeedback('Copiado!');
      } catch {
        this.status = 'Não foi possível copiar o prontuário.';
        this.showCopyFeedback('Falha ao copiar');
      }
    }
  }

  private extractPlainText(html: string): string {
    if (!html) return '';
    const el = document.createElement('div');
    el.innerHTML = html;
    return el.textContent?.trim() ?? '';
  }

  private fallbackCopy(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!ok) {
      throw new Error('copy command failed');
    }
  }

  private showCopyFeedback(message: string) {
    this.copyFeedback = message;
    if (this.copyFeedbackTimer) {
      clearTimeout(this.copyFeedbackTimer);
    }
    this.copyFeedbackTimer = setTimeout(() => {
      this.copyFeedback = '';
      this.copyFeedbackTimer = null;
      try { this.cdr.detectChanges(); } catch { }
    }, 2000);
    try { this.cdr.detectChanges(); } catch { }
  }

  private clearCopyFeedback() {
    if (this.copyFeedbackTimer) {
      clearTimeout(this.copyFeedbackTimer);
      this.copyFeedbackTimer = null;
    }
    this.copyFeedback = '';
  }

  exportSummary() {
    if (!this.lastSummaryMarkdown && !this.lastSummaryRaw) return;
    
    try {
      // Cria documento PDF em formato A4
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Configurações de margem e dimensões
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (2 * margin);
      let yPosition = margin;

      // Função auxiliar para adicionar nova página se necessário
      const checkPageBreak = (requiredSpace: number = 10) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Cabeçalho do documento
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Prontuário Médico', margin, yPosition);
      yPosition += 12;

      // Linha separadora
      doc.setDrawColor(3, 105, 161);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Informações do paciente
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Paciente:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(this.patientName, margin + 25, yPosition);
      yPosition += 7;

      if (this.patientCpf) {
        doc.setFont('helvetica', 'bold');
        doc.text('CPF:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(this.patientCpf, margin + 25, yPosition);
        yPosition += 7;
      }

      if (this.patientNascimento) {
        doc.setFont('helvetica', 'bold');
        doc.text('Nascimento:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(this.patientNascimento, margin + 25, yPosition);
        yPosition += 7;
      }

      if (this.sessionStartedLabel) {
        doc.setFont('helvetica', 'bold');
        doc.text('Data da consulta:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(this.sessionStartedLabel, margin + 40, yPosition);
        yPosition += 7;
      }

      yPosition += 5;
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Conteúdo do prontuário - processa markdown
      const content = this.lastSummaryMarkdown || this.extractPlainText(this.lastSummaryRaw);
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          yPosition += 4;
          continue;
        }

        checkPageBreak(15);

        // Títulos H1
        if (trimmed.startsWith('# ')) {
          yPosition += 3;
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(3, 105, 161);
          const text = trimmed.substring(2).trim();
          const wrappedText = doc.splitTextToSize(text, maxWidth);
          doc.text(wrappedText, margin, yPosition);
          yPosition += wrappedText.length * 7 + 3;
          doc.setTextColor(0, 0, 0);
          continue;
        }

        // Títulos H2
        if (trimmed.startsWith('## ')) {
          yPosition += 2;
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(3, 105, 161);
          const text = trimmed.substring(3).trim();
          const wrappedText = doc.splitTextToSize(text, maxWidth);
          doc.text(wrappedText, margin, yPosition);
          yPosition += wrappedText.length * 6 + 2;
          doc.setTextColor(0, 0, 0);
          continue;
        }

        // Títulos H3
        if (trimmed.startsWith('### ')) {
          yPosition += 2;
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          const text = trimmed.substring(4).trim();
          const wrappedText = doc.splitTextToSize(text, maxWidth);
          doc.text(wrappedText, margin, yPosition);
          yPosition += wrappedText.length * 5.5 + 2;
          continue;
        }

        // Itens de lista
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          const text = trimmed.substring(2).trim();
          const wrappedText = doc.splitTextToSize(text, maxWidth - 5);
          doc.text('•', margin + 2, yPosition);
          doc.text(wrappedText, margin + 7, yPosition);
          yPosition += wrappedText.length * 5 + 1;
          continue;
        }

        // Texto em negrito **texto**
        if (trimmed.includes('**')) {
          doc.setFontSize(11);
          const parts = trimmed.split('**');
          let xPos = margin;
          
          for (let i = 0; i < parts.length; i++) {
            if (!parts[i]) continue;
            
            if (i % 2 === 1) {
              doc.setFont('helvetica', 'bold');
            } else {
              doc.setFont('helvetica', 'normal');
            }
            
            const wrappedText = doc.splitTextToSize(parts[i], maxWidth - (xPos - margin));
            doc.text(wrappedText, xPos, yPosition);
            
            if (wrappedText.length > 1) {
              yPosition += (wrappedText.length - 1) * 5;
              xPos = margin;
            } else {
              xPos += doc.getTextWidth(parts[i]);
            }
          }
          yPosition += 5;
          continue;
        }

        // Texto normal
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const wrappedText = doc.splitTextToSize(trimmed, maxWidth);
        doc.text(wrappedText, margin, yPosition);
        yPosition += wrappedText.length * 5 + 2;
      }

      // Rodapé em todas as páginas
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.text(
          `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
          pageWidth - margin,
          pageHeight - 10,
          { align: 'right' }
        );
      }

      // Salva o PDF
      const safePatientName = this.patientName
        .trim()
        .replace(/[<>:"/\\|?*\s]+/g, '_')
        .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
      const fileName = `${safePatientName}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      
      this.status = 'Prontuário exportado com sucesso.';
      this.showCopyFeedback('PDF baixado!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      this.status = 'Erro ao exportar prontuário.';
      this.showCopyFeedback('Falha ao gerar PDF');
    }
  }

  toggleEditProntuario() {
    this.isEditingProntuario = !this.isEditingProntuario;
    if (!this.isEditingProntuario) {
      // Quando sai do modo edição sem salvar, mantém o conteúdo original
      this.summaryHtml = this.sanitizer.bypassSecurityTrustHtml(this.lastSummaryRaw);
    }
  }

  saveProntuarioEdits() {
    const editableDiv = document.querySelector('.summary-content.editing') as HTMLElement;
    if (!editableDiv) return;
    const updatedHtml = editableDiv.innerHTML;
    this.lastSummaryRaw = updatedHtml;
    this.summaryHtml = this.sanitizer.bypassSecurityTrustHtml(updatedHtml);
    // Atualiza também o markdown para que o PDF reflita as mudanças
    this.lastSummaryMarkdown = this.htmlToMarkdown(updatedHtml);
    this.isEditingProntuario = false;
    this.status = 'Prontuário atualizado.';
    this.showCopyFeedback('Alterações salvas!');
  }

  private htmlToMarkdown(html: string): string {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let markdown = '';
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        const children = Array.from(element.childNodes).map(processNode).join('');
        
        switch (tagName) {
          case 'h1':
            return `# ${children}\n\n`;
          case 'h2':
            return `## ${children}\n\n`;
          case 'h3':
            return `### ${children}\n\n`;
          case 'b':
          case 'strong':
            return `**${children}**`;
          case 'i':
          case 'em':
            return `*${children}*`;
          case 'li':
            return `- ${children}\n`;
          case 'br':
            return '\n';
          case 'p':
            return `${children}\n\n`;
          default:
            return children;
        }
      }
      
      return '';
    };
    
    markdown = Array.from(tempDiv.childNodes).map(processNode).join('');
    // Limpa múltiplas quebras de linha consecutivas
    return markdown.replace(/\n{3,}/g, '\n\n').trim();
  }


}