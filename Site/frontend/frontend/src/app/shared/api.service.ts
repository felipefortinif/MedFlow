import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface UploadAudioResponse { id: number; message: string; }
export interface BatchTranscribeResponse { message: string; transcript: string; }
export interface SummarizeResponse { summary: string; }
export interface LoginResponse { token: string; msg?: string }
export interface SignupResponse { message?: string; error?: any }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://127.0.0.1:8000/';
  // TODO: mover baseUrl para environment.ts para alternar entre dev/prod

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<LoginResponse> {
    const body = { username, password };
    return this.http
      .post<LoginResponse>(`${this.baseUrl}doctor/token-auth/`, body)
      .pipe(catchError(this.handleError));
  }

  signup(username: string,
    password: string,
    first_name: string, 
    last_name: string,
    email: string,
    cpf: string,
    date_of_birth: string,
    phone: string,
    crm: string,
    specialty: number): Observable<SignupResponse> {
    const body = { username, password, first_name, last_name, email, cpf, date_of_birth, phone, crm, specialty };
    return this.http
      .post<SignupResponse>(`${this.baseUrl}doctor/account/`, body)
      .pipe(catchError(this.handleError));
  }

  transcribeBatch(file: Blob | File): Observable<BatchTranscribeResponse> {
    const form = new FormData();
    form.append('audio', file, (file as File).name ?? 'chunk.wav');
    return this.http.post<BatchTranscribeResponse>(`${this.baseUrl}transcriber/api/transcribe/batch/`, form)
      .pipe(catchError(this.handleError));
  }

  summarizeTranscript(transcript: string, CSRFToken: string): Observable<SummarizeResponse> {
    const body = { transcript };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'X-CSRFToken': CSRFToken });
    return this.http.post<SummarizeResponse>(`${this.baseUrl}summerizer/api/summarize/`, body, { headers })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
