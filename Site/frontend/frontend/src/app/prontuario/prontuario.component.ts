import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { StateService } from '../shared/state.service';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-prontuario',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './prontuario.component.html',
  styleUrls: ['./prontuario.component.css']
})
export class ProntuarioComponent {
  isLoading = false;
  summary: import('@angular/platform-browser').SafeHtml = '';
  backendUrl = 'http://127.0.0.1:8000/';

  constructor(
    private sanitizer: DomSanitizer,
    public state: StateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private api: ApiService
  ) { }

  get patientName(): string {
    return this.state.paciente()?.nome ?? 'Paciente';
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

  async gerarProntuario() {
    this.isLoading = true;
    this.summary = 'Summarizing...';

    try {
      const data = await firstValueFrom(this.api.summarizeTranscript(this.state.fullTranscript()));

      if (data?.summary) {
        const html = this.markdownToHtml(data.summary);
        this.summary = this.sanitizer.bypassSecurityTrustHtml(html);
      } else {
        this.summary = 'No summary returned.';
      }
    } catch (_err) {
      this.summary = 'Error summarizing transcript.';
    } finally {
      this.isLoading = false;
      try { this.cdr.detectChanges(); } catch { }
    }
  }


  audioUrl(blob: Blob | null): string | null {
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }
}
