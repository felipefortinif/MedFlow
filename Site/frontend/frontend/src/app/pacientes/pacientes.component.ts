import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

interface PacienteItem {
  nome: string;
  cpf: string;
  nascimento?: string;
}

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pacientes.component.html',
  styleUrls: ['./pacientes.component.css']
})
export class PacientesComponent {
  pacientes: PacienteItem[] = [
    { nome: 'Ana Paula', cpf: '123.456.789-00', nascimento: '1990-04-12' },
    { nome: 'Bruno Silva', cpf: '987.654.321-00', nascimento: '1985-09-30' },
    { nome: 'Carlos Souza', cpf: '321.654.987-00', nascimento: '1978-02-18' },
    { nome: 'Daniela Rocha', cpf: '111.222.333-44', nascimento: '1995-12-05' },
  ];

  constructor(private router: Router) {}

  adicionarPaciente() {
    // Leva para a tela principal para cadastro/fluxo de novo paciente
    this.router.navigateByUrl('/tela-principal');
  }
}
