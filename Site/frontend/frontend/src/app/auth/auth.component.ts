import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  forgotEmail = '';
  forgotMessage = '';
  forgotError = '';

  isLoading = false;
  error = '';

  constructor(private router: Router) { }

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
      // TODO: integrar com backend
      await new Promise(r => setTimeout(r, 600));
      this.router.navigateByUrl('/pacientes');
    } catch (e) {
      this.error = 'Falha no login';
    } finally {
      this.isLoading = false;
    }
  }

  async onSignup() {
    this.isLoading = true;
    this.error = '';

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
