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

  private mediaRecorder?: MediaRecorder;
  private audioChunks: Blob[] = [];
  private batchTimer?: any;

  constructor(private api: ApiService, private state: StateService, private router: Router) {}

  ngOnInit(): void {
    this.transcript = '';
    this.state.resetTranscript();
  }

  ngOnDestroy(): void {
    this.clearBatchTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  get patientName(): string {
    return this.state.paciente()?.nome ?? 'Paciente';
  }

  async startRecording() {
    if (this.isRecording) return;
    this.isRecording = true;
    this.status = 'Gravando...';
    this.showGenerate = false;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstart = () => {
      this.startBatchTimer();
    };

    this.mediaRecorder.onstop = async () => {
      this.clearBatchTimer();
      const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.state.setLastAudio(blob);
      // Upload final audio (optional) and enable generate
      this.showGenerate = true;
      this.status = 'Gravação finalizada';
    };

    this.mediaRecorder.start(1000);
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.isRecording = false;
    this.mediaRecorder.stop();
  }

  private startBatchTimer() {
    this.clearBatchTimer();
    this.batchTimer = setInterval(async () => {
      if (!this.audioChunks.length) return;
      const chunk = new Blob(this.audioChunks.splice(0), { type: 'audio/webm' });
      try {
        const wavBlob = await this.convertWebmToWav(chunk);
        const resp = await firstValueFrom(this.api.transcribeBatch(wavBlob));
        if (resp?.transcript) {
          this.state.appendTranscript(resp.transcript);
          this.transcript = this.state.fullTranscript();
        }
      } catch (e) {
        console.error('Transcribe batch error', e);
      }
    }, 3000);
  }

  private clearBatchTimer() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }
  }

  async generateProntuario() {
    const text = this.state.fullTranscript();
    if (!text) return;
    this.router.navigateByUrl('/prontuario');
  }

  // Simple audio conversion using Web Audio API to PCM WAV
  private async convertWebmToWav(blob: Blob): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const wavBuffer = this.encodeWAV(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  private encodeWAV(audioBuffer: AudioBuffer): ArrayBuffer {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + audioBuffer.length * numOfChan * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * numOfChan * 2, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, audioBuffer.length * numOfChan * 2, true);

    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        const sample = audioBuffer.getChannelData(ch)[i];
        const s = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}
