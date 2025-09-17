import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ApiService, LoginResponse } from '../shared/api.service';

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
  // Campos adicionais necessários para cadastro completo
  signupUsername = '';
  signupFirstName = '';
  signupLastName = '';
  signupCpf = '';
  signupPhone = '';
  signupDateOfBirth = '';
  signupCrm = '';
  signupSpecialty: number | null = null;

  forgotEmail = '';
  forgotMessage = '';
  forgotError = '';

  isLoading = false;
  error = '';
  success = '';

  constructor(private router: Router, private api: ApiService) { }

  switch(mode: 'login' | 'signup' | 'forgot') {
    this.mode = mode;
    this.error = '';
    this.success = '';
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
      const resp = await (await import('rxjs')).firstValueFrom(
        this.api.login(this.loginEmail, this.loginPassword)
      );

      if (resp && (resp as LoginResponse).token) {
        // Guarde o token (Bearer/Token) – backend usa DRF Token
        localStorage.setItem('auth_token', (resp as LoginResponse).token);
        // Opcional: prefixo para header Authorization em chamadas futuras
        // Ex.: 'Token ' + token
        this.router.navigateByUrl('/pacientes');
      } else {
        this.error = (resp as LoginResponse)?.msg || 'Falha no login';
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

    // Validar obrigatórios conforme backend: username, password, email, cpf, crm, specialty
    if (!this.signupUsername || !this.signupEmail || !this.signupPassword || !this.signupPasswordConfirm || !this.signupCpf || !this.signupCrm || this.signupSpecialty === null) {
      this.error = 'Preencha todos os campos obrigatórios.';
      this.isLoading = false;
      return;
    }

    try {
      const { firstValueFrom } = await import('rxjs');
      const resp = await firstValueFrom(
        this.api.signup(
          this.signupUsername,
          this.signupPassword,
          this.signupFirstName,
          this.signupLastName,
          this.signupEmail,
          this.signupCpf,
          this.signupDateOfBirth,
          this.signupPhone,
          this.signupCrm,
          this.signupSpecialty ?? 0
        )
      );
      // Sucesso no cadastro: mostrar mensagem por 2s antes de ir para login
      this.error = '';
      this.success = 'Cadastrado com sucesso';
      setTimeout(() => {
        this.success = '';
        this.mode = 'login';
      }, 2000);
    } catch (e) {
      let msg = 'Falha no cadastro';
      if (e && typeof e === 'object') {
        const anyErr = e as { error?: any; message?: string };
        msg = anyErr?.error?.msg || anyErr?.message || msg;
      }
      this.error = msg;
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
