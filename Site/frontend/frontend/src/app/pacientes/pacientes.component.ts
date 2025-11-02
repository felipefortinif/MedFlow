import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService, Patient } from '../shared/api.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

interface PacienteItem {
  id: number;
  nome: string;
}

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, FormsModule],
  templateUrl: './pacientes.component.html',
  styleUrls: ['./pacientes.component.css']
})
export class PacientesComponent implements OnInit {
  pacientes: PacienteItem[] = [];
  pacientesFiltrados: PacienteItem[] = [];
  searchTerm = '';
  loading = false;
  error = '';

  constructor(private router: Router, private api: ApiService) { }

  ngOnInit(): void {
    this.carregarPacientes();
  }

  carregarPacientes() {
    this.loading = true;
    this.error = '';
    this.api.getPatientsList().subscribe({
      next: (list: Patient[]) => {
        this.pacientes = (list || []).map(p => ({
          id: p.id,
          nome: p.name
        }));
        this.pacientesFiltrados = [...this.pacientes];
        this.loading = false;
      },
      error: (err) => {
        if (err.status === 401) {
          this.error = 'Não autorizado. Faça login novamente.';
          this.router.navigateByUrl('/auth');
        } else {
          this.error = 'Falha ao carregar pacientes.';
        }
        this.loading = false;
      }
    });
  }

  filtrarPacientes() {
    const termo = this.searchTerm.toLowerCase().trim();
    
    if (!termo) {
      this.pacientesFiltrados = [...this.pacientes];
      return;
    }

    this.pacientesFiltrados = this.pacientes.filter(p =>
      p.nome.toLowerCase().includes(termo)
    );
  }

  limparBusca() {
    this.searchTerm = '';
    this.pacientesFiltrados = [...this.pacientes];
  }

  adicionarPaciente() {
    this.router.navigate(['/criar-paciente']);
  }

  abrirPaciente(id: number) {
    this.router.navigate(['/pacientes', id]);
  }

}