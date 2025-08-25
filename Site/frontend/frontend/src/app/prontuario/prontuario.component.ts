import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { StateService } from '../shared/state.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-prontuario',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './prontuario.component.html',
  styleUrls: ['./prontuario.component.css']
})
export class ProntuarioComponent {
  isLoading = false;
  summary = '';

  constructor(private api: ApiService, public state: StateService, private router: Router) {}

  get patientName(): string {
    return this.state.paciente()?.nome ?? 'Paciente';
  }

  async gerarProntuario() {
    const transcript = this.state.fullTranscript();
    if (!transcript) return;
    this.isLoading = true;
    this.summary = '';
    try {
  const resp = await firstValueFrom(this.api.summarizeTranscript(transcript));
      this.summary = resp?.summary ?? '';
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading = false;
    }
  }

  audioUrl(blob: Blob | null): string | null {
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }
}
