import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ApiService, LoginResponse } from '../shared/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent {
  mode: 'login' | 'signup' | 'forgot' = 'login';
  // fluxo de "forgot" em 3 etapas: 1-email, 2-token, 3-nova-senha
  forgotStep: 1 | 2 | 3 = 1;

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
  forgotCode = '';
  forgotNewPassword = '';
  forgotConfirmPassword = '';
  forgotMessage = '';
  forgotError = '';

  isLoading = false;
  error = '';
  success = '';

  private returnUrl: string | null = null;

  constructor(private router: Router, private route: ActivatedRoute, private api: ApiService) {
    // capture returnUrl if present
    this.route.queryParamMap.subscribe(q => {
      const r = q.get('returnUrl');
      this.returnUrl = r && r !== '/login' ? r : null;
    });
  }

  switch(mode: 'login' | 'signup' | 'forgot') {
    this.mode = mode;
    this.error = '';
    this.success = '';
    this.forgotMessage = '';
    this.forgotError = '';
    if (mode === 'forgot') {
      this.forgotStep = 1; // sempre iniciar na etapa 1
    }
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
      const resp = await firstValueFrom(
        this.api.login(this.loginEmail, this.loginPassword)
      );

      if (resp && (resp as LoginResponse).token) {
        // Guarde o token (Bearer/Token) – backend usa DRF Token
        localStorage.setItem('auth_token', (resp as LoginResponse).token);
        // Opcional: prefixo para header Authorization em chamadas futuras
        // Ex.: 'Token ' + token
        const target = this.returnUrl || '/pacientes';
        this.router.navigateByUrl(target);
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

  // Etapa 1: enviar email
  async sendPasswordReset() {
    this.isLoading = true;
    this.forgotMessage = '';
    this.forgotError = '';
    try {
      if (!this.forgotEmail) {
        this.forgotError = 'Informe o e-mail.';
        return;
      }
        const resp = await firstValueFrom(this.api.passwordReset(this.forgotEmail));
        if (resp.status === 200) {
          this.forgotMessage = 'Enviamos um token para o seu e-mail. Verifique sua caixa de entrada.';
          // guarda o email para referência (não limpar ainda)
          sessionStorage.setItem('reset_email', this.forgotEmail);
          this.forgotStep = 2; // avançar para etapa de token
        }
    } catch (e) {
        // Pode retornar 400 se e-mail não existir
        let msg = 'Falha ao solicitar redefinição.';
        if (e && typeof e === 'object') {
          const anyErr = e as { status?: number; error?: any; message?: string };
          if (anyErr?.status === 400) {
            msg = 'Email não encontrado';
          } else {
            msg = anyErr?.error?.detail || anyErr?.error?.msg || anyErr?.message || msg;
          }
        }
        this.forgotError = msg;
    } finally {
      this.isLoading = false;
    }
  }

  // Etapa 2: validar token
  async validateResetToken() {
    this.isLoading = true;
    this.forgotMessage = '';
    this.forgotError = '';
    try {
      if (!this.forgotCode) {
        this.forgotError = 'Informe o token recebido por e-mail.';
        return;
      }
      const resp = await firstValueFrom(this.api.passwordResetValidate(this.forgotCode));
      if (resp.status === 200) {
        const valid = (resp.body as any)?.valid;
        if (valid === false) {
          this.forgotError = (resp.body as any)?.message || 'Token inválido ou expirado.';
        } else {
          // guarda token
          sessionStorage.setItem('reset_token', this.forgotCode);
          this.forgotMessage = 'Token validado com sucesso.';
          this.forgotStep = 3; // avança para nova senha
        }
      } else {
        this.forgotError = 'Não foi possível validar o token.';
      }
    } catch (e: any) {
      this.forgotError = e?.error?.detail || e?.message || 'Falha ao validar token';
    } finally {
      this.isLoading = false;
    }
  }

  // Etapa 3: confirmar nova senha
  async confirmPasswordReset() {
    this.isLoading = true;
    this.forgotMessage = '';
    this.forgotError = '';
    try {
      if (!this.forgotNewPassword || !this.forgotConfirmPassword) {
        this.forgotError = 'Preencha todos os campos.';
        return;
      }
      if (this.forgotNewPassword !== this.forgotConfirmPassword) {
        this.forgotError = 'As senhas não coincidem.';
        return;
      }
      const token = sessionStorage.getItem('reset_token') || this.forgotCode;
      const resp = await firstValueFrom(this.api.passwordResetConfirm(token, this.forgotNewPassword));
      if (resp.status === 200) {
        this.forgotMessage = 'Senha alterada com sucesso. Você já pode entrar com a nova senha.';
        // Limpa os campos sensíveis
        this.forgotCode = '';
        this.forgotNewPassword = '';
        this.forgotConfirmPassword = '';
        sessionStorage.removeItem('reset_token');
        // Opcional: voltar para tela de login automaticamente
        setTimeout(() => this.switch('login'), 1200);
      } else {
        this.forgotError = 'Não foi possível alterar a senha.';
      }
    } catch (e) {
      // Mostra mensagem real do backend (ex.: validações de senha)
      this.forgotError = this.extractBackendError(e) || 'Não foi possível alterar a senha.';
    } finally {
      this.isLoading = false;
    }
  }

  // Tenta extrair uma mensagem útil vinda do backend (DRF/Django)
  private extractBackendError(e: any): string {
    try {
      const err = (e && typeof e === 'object') ? (e.error ?? e) : e;
      if (!err) return '';
      if (typeof err === 'string') return err;
      if (typeof err?.detail === 'string') return err.detail;
      if (typeof err?.msg === 'string') return err.msg;
      if (Array.isArray(err)) return err.join(' ');
      if (typeof err === 'object') {
        const preferredKeys = ['password', 'new_password', 'non_field_errors', 'token', 'email'];
        const msgs: string[] = [];
        for (const key of preferredKeys) {
          const v = (err as any)[key];
          if (!v) continue;
          if (Array.isArray(v)) msgs.push(...v.map(String));
          else if (typeof v === 'string') msgs.push(v);
        }
        for (const [k, v] of Object.entries(err)) {
          if (preferredKeys.includes(k)) continue;
          if (Array.isArray(v)) msgs.push(...v.map(String));
          else if (typeof v === 'string') msgs.push(v);
        }
        return msgs.join(' ').trim();
      }
      return '';
    } catch {
      return '';
    }
  }
}
