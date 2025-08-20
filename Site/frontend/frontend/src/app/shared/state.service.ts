import { Injectable, signal } from '@angular/core';

export interface Paciente {
  nome: string;
  cpf: string;
  nascimento: string; // yyyy-mm-dd
}

@Injectable({ providedIn: 'root' })
export class StateService {
  readonly paciente = signal<Paciente | null>(null);
  readonly fullTranscript = signal<string>('');
  readonly lastAudioBlob = signal<Blob | null>(null);

  setPaciente(p: Paciente) {
    this.paciente.set(p);
  }

  appendTranscript(part: string) {
    const cur = this.fullTranscript();
    this.fullTranscript.set((cur + ' ' + part).trim());
  }

  resetTranscript() {
    this.fullTranscript.set('');
  }

  setLastAudio(blob: Blob | null) {
    this.lastAudioBlob.set(blob);
  }
}
