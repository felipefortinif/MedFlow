import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tela-teste',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tela_teste.component.html',
  styleUrls: ['./tela_teste.component.css'],
})
export class TelaTeste implements OnDestroy {
  // Estado de UI
  isRecording = false;
  statusText = '';
  transcriptText = '';
  canSummarize = false;
  summaryHtml: SafeHtml = '';
  backendUrl = 'http://127.0.0.1:8000/';

  // Gravação
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: BlobPart[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private stopRequested = false;

  // Dados
  private fullTranscript = '';

  constructor(private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) {}

  // --------- Utilidades ---------

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
    this.canSummarize = this.fullTranscript.trim().length > 0;
  // Garantir que Angular detecte a mudança mesmo que o evento venha de fora da zona
  try { this.cdr.detectChanges(); } catch (_e) {}
  }

  private startBatchTimer(): void {
    this.clearBatchTimer();
    this.batchTimer = setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop(); // dispara ondataavailable
      }
    }, 10000); // 10s por batch
  }

  private clearBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  // --------- Fluxo de gravação por BATCHES ---------

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
        this.fullTranscript = '';

        this.stream = stream;
        // inicia o primeiro recorder de batch
        this.startRecorderForBatch(stream);
      })
      .catch((_err) => {
        this.statusText = 'Microphone access denied.';
      });
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.stopRequested = true;
      this.mediaRecorder.stop(); // ondataavailable final terá isFinal = true
    }
  }

  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

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

  // --------- API ---------

  private async sendAudioBatch(blob: Blob, isFinal = false): Promise<void> {
    const formData = new FormData();
    formData.append('audio', blob, 'batch.webm');
    formData.append('is_final', isFinal ? '1' : '0');

    try {
      const response = await fetch(this.backendUrl + 'transcriber/api/transcribe/batch/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': this.getCSRFToken(),
        } as Record<string, string>,
        body: formData,
      });

      const data: { transcript?: string } = await response.json();
      if (data?.transcript) this.appendTranscript(data.transcript);

      this.statusText = isFinal ? 'Recording stopped.' : 'Batch sent!';
    } catch (_err) {
      this.statusText = 'Error sending audio batch.';
    }
  }

  async sendTranscriptForSummary(): Promise<void> {
    this.summaryHtml = 'Summarizing...';

    try {
      const response = await fetch(this.backendUrl + 'summerizer/api/summarize/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken(),
        } as Record<string, string>,
        body: JSON.stringify({ transcript: this.fullTranscript }),
      });

      const data: { summary?: string } = await response.json();
      if (data?.summary) {
        const html = this.markdownToHtml(data.summary);
        this.summaryHtml = this.sanitizer.bypassSecurityTrustHtml(html);
      } else {
        this.summaryHtml = 'No summary returned.';
      }
    } catch (_err) {
      this.summaryHtml = 'Error summarizing transcript.';
    }
  }

  // --------- Markdown -> HTML (mínimo) ---------

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

  // --------- Lifecycle ---------

  ngOnDestroy(): void {
    this.clearBatchTimer();
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.stopStream();
  }
}
