import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent {
  mode: 'login' | 'signup' | 'forgot' = 'login';

  // simples estado local; depois integre com backend
  loginEmail = '';
  loginPassword = '';

  signupName = '';
  signupEmail = '';
  signupPassword = '';
  signupPasswordConfirm = '';

  forgotEmail = '';
  forgotMessage = '';
  forgotError = '';

  isLoading = false;
  error = '';

  constructor(private router: Router, private http: HttpClient) { }

  private backendUrl = 'http://127.0.0.1:8000';

  switch(mode: 'login' | 'signup' | 'forgot') {
    this.mode = mode;
    this.error = '';
    this.forgotMessage = '';
    this.forgotError = '';
  }

  async onLogin() {
    this.isLoading = true;
    this.error = '';

    if (!this.loginEmail || !this.loginPassword) {
      this.error = 'Preencha todos os campos.';
      this.isLoading = false;
      return;
    }

    try {
      // No backend, o endpoint espera username e password
      const payload = { username: this.loginEmail, password: this.loginPassword };
      const resp = await this.http.post<{ token: string; msg?: string }>(
        `${this.backendUrl}/doctor/token-auth/`,
        payload
      ).toPromise();

      if (resp && resp.token) {
        // Guarde o token (Bearer/Token) – backend usa DRF Token
        localStorage.setItem('auth_token', resp.token);
        // Opcional: prefixo para header Authorization em chamadas futuras
        // Ex.: 'Token ' + token
        this.router.navigateByUrl('/pacientes');
      } else {
        this.error = resp?.msg || 'Falha no login';
      }
    } catch (e) {
      // DRF envia 401 com body {msg: 'Login ou Senha Inválidos.'}
        let msg = 'Falha no login';
        if (e && typeof e === 'object') {
          const anyErr = e as { error?: any; message?: string };
          msg = anyErr?.error?.msg || anyErr?.message || msg;
        }
      this.error = msg;
    } finally {
      this.isLoading = false;
    }
  }

  async onSignup() {
    this.isLoading = true;
    this.error = '';
    if (this.signupPassword !== this.signupPasswordConfirm) {
      this.error = 'As senhas não coincidem.';
      this.isLoading = false;
      return;
    }

    if (!this.signupName || !this.signupEmail || !this.signupPassword) {//|| !this.signupPasswordConfirm) {
      this.error = 'Preencha todos os campos.';
      this.isLoading = false;
      return;
    }

    try {
      // TODO: integrar com backend
      await new Promise(r => setTimeout(r, 800));
      this.router.navigateByUrl('/pacientes');
    } catch (e) {
      this.error = 'Falha no cadastro';
    } finally {
      this.isLoading = false;
    }
  }

  async sendPasswordReset() {
    this.isLoading = true;
    this.forgotMessage = '';
    this.forgotError = '';
    try {
      if (!this.forgotEmail) {
        this.forgotError = 'Informe o e-mail.';
        return;
      }
      // TODO: substituir por chamada real ao backend (ex: ApiService.requestPasswordReset)
      await new Promise(r => setTimeout(r, 800));
      this.forgotMessage = 'Se o e-mail existir, você receberá instruções para resetar sua senha.';
      this.forgotEmail = '';
    } catch (e) {
      this.forgotError = 'Falha ao solicitar redefinição.';
    } finally {
      this.isLoading = false;
    }
  }
}
