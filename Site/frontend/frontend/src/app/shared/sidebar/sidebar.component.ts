import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  menuItems = [
    { path: '/pacientes', label: 'Pacientes', icon: '➔' },
    { path: '/criar-paciente', label: 'Novo Paciente', icon: '✚' },
  ];

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  logout(): void {
    this.apiService.logout().subscribe({
      next: () => {
        this.clearAndRedirect();
      },
      error: () => {
        // Mesmo se der erro no backend, limpa localmente
        this.clearAndRedirect();
      }
    });
  }

  private clearAndRedirect(): void {
    // Limpa os dados do localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('doctor_id');
    localStorage.removeItem('user_email');
    
    // Redireciona para a tela de login
    this.router.navigate(['/login']);
  }
}
