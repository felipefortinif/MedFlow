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
  mode: 'login' | 'signup' = 'login';

  // simples estado local; depois integre com backend
  loginEmail = '';
  loginPassword = '';

  signupName = '';
  signupEmail = '';
  signupPassword = '';

  isLoading = false;
  error = '';

  constructor(private router: Router) {}

  switch(mode: 'login' | 'signup') {
    this.mode = mode;
    this.error = '';
  }

  async onLogin() {
    this.isLoading = true;
    this.error = '';
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
}
