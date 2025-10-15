import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface UploadAudioResponse { id: number; message: string; }
export interface BatchTranscribeResponse { message: string; transcript: string; }
export interface SummarizeResponse { summary: string; }
export interface LoginResponse { token: string; msg?: string }
export interface SignupResponse { message?: string; error?: any }
export interface passwordResetResponse { message?: string; error?: any }
export interface PasswordResetValidateResponse { valid: boolean; message?: string }
export interface Patient { id: number; name: string; }
export interface DoctorProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile?: any;
}
export interface CreatePatientRequest {
  doctor: number;
  name: string;
  email: string;
  cpf: string;
  date_of_birth: string; // yyyy-mm-dd
  phone: string;
}
export interface CreatePatientResponse {
  id: number;
  name: string;
  email: string;
  cpf: string;
  date_of_birth: string;
  phone: string;
}

export interface PatientDetail extends CreatePatientResponse {
  doctor: number;
}

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

  passwordReset(email: string): Observable<HttpResponse<passwordResetResponse>> {
    const body = { email };
    return this.http
      .post<passwordResetResponse>(`${this.baseUrl}doctor/password_reset/`, body, { observe: 'response' })
      .pipe(catchError(this.handleError));
  }

  // Valida o token de redefinição de senha recebido por e-mail
  passwordResetValidate(token: string): Observable<HttpResponse<PasswordResetValidateResponse>> {
    const body = { token };
    return this.http
      .post<PasswordResetValidateResponse>(`${this.baseUrl}doctor/password_reset/validate_token/`, body, { observe: 'response' })
      .pipe(catchError(this.handleError));
  }

  // Confirma a redefinição de senha usando o código recebido por e-mail
  passwordResetConfirm(token: string, password: string): Observable<HttpResponse<any>> {
    const body = { token, password };
    return this.http
      .post(`${this.baseUrl}doctor/password_reset/confirm/`, body, { observe: 'response' })
      .pipe(catchError(this.handleError));
  }

  createPatient(payload: CreatePatientRequest, csrfToken?: string): Observable<CreatePatientResponse> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const authToken = localStorage.getItem('auth_token');
    if (authToken) headers = headers.set('Authorization', `Token ${authToken}`);
    if (csrfToken) headers = headers.set('X-CSRFToken', csrfToken);
    return this.http
      .post<CreatePatientResponse>(`${this.baseUrl}doctor/patient/`, payload, { headers })
      .pipe(catchError(this.handleError));
  }

  getDoctorProfile(): Observable<DoctorProfile> {
    let headers = new HttpHeaders();
    const authToken = localStorage.getItem('auth_token');
    if (authToken) headers = headers.set('Authorization', `Token ${authToken}`);
    return this.http
      .get<DoctorProfile>(`${this.baseUrl}doctor/account/`, { headers })
      .pipe(catchError(this.handleError));
  }

  getPatientById(patientId: number): Observable<PatientDetail> {
    let headers = new HttpHeaders();
    const token = localStorage.getItem('auth_token');
    if (token) headers = headers.set('Authorization', `Token ${token}`);

    const params = new HttpParams().set('id', patientId.toString());

    return this.http
      .get<PatientDetail>(`${this.baseUrl}doctor/patient/`, { headers, params })
      .pipe(catchError(this.handleError));
  }

  updatePatient(patientId: number, payload: CreatePatientRequest, csrfToken?: string): Observable<PatientDetail> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = localStorage.getItem('auth_token');
    if (token) headers = headers.set('Authorization', `Token ${token}`);
    if (csrfToken) headers = headers.set('X-CSRFToken', csrfToken);

    const params = new HttpParams().set('id', patientId.toString());

    return this.http
      .put<PatientDetail>(`${this.baseUrl}doctor/patient/`, payload, { headers, params })
      .pipe(catchError(this.handleError));
  }

  deletePatient(patientId: number): Observable<void> {
    let headers = new HttpHeaders();
    const token = localStorage.getItem('auth_token');
    if (token) headers = headers.set('Authorization', `Token ${token}`);

    const params = new HttpParams().set('id', patientId.toString());

    return this.http
      .delete<void>(`${this.baseUrl}doctor/patient/`, { headers, params })
      .pipe(catchError(this.handleError));
  }


  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
  getPatientsList(): Observable<Patient[]> {
    let headers = new HttpHeaders();
    const token = localStorage.getItem('auth_token');
    if (token) headers = headers.set('Authorization', `Token ${token}`);
    return this.http.get<Patient[]>(`${this.baseUrl}doctor/patients_list/`, { headers })
      .pipe(catchError(this.handleError));
  }
}
