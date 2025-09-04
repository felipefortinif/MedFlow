import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface UploadAudioResponse { id: number; message: string; }
export interface BatchTranscribeResponse { message: string; transcript: string; }
export interface SummarizeResponse { summary: string; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  // Ajuste se o backend expõe em outra origem/porta
  private baseUrl = 'http://127.0.0.1:8000/';

  constructor(private http: HttpClient) { }

  uploadAudio(file: Blob | File): Observable<UploadAudioResponse> {
    const form = new FormData();
    form.append('audio', file, (file as File).name ?? 'audio.wav');
    return this.http.post<UploadAudioResponse>(`${this.baseUrl}/audio/upload/`, form)
      .pipe(catchError(this.handleError));
  }

  transcribeBatch(file: Blob | File): Observable<BatchTranscribeResponse> {
    const form = new FormData();
    form.append('audio', file, (file as File).name ?? 'chunk.wav');
    return this.http.post<BatchTranscribeResponse>(`${this.baseUrl}transcriber/api/transcribe/batch/`, form)
      .pipe(catchError(this.handleError));
  }

  summarizeTranscript(transcript: string): Observable<SummarizeResponse> {
    const body = { transcript };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<SummarizeResponse>(`${this.baseUrl}/summerize/`, body, { headers })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
