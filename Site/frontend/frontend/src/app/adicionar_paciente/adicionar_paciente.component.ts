import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../shared/state.service';

@Component({
  selector: 'app-adicionar-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adicionar_paciente.component.html',
  styleUrls: ['./adicionar_paciente.component.css']
})
export class AdicionarPacienteComponent {
  nome = '';
  cpf = '';
  nascimento = '';
  erro = '';

  constructor(private router: Router, private state: StateService) {}

  onSubmit() {
    this.erro = '';
    if (!this.nome || !this.cpf || !this.nascimento) {
      this.erro = 'Preencha todos os campos.';
      return;
    }
    // Simples: só setamos no state e navegamos. Lógica de "se existir" pode ser feita no backend depois.
    this.state.setPaciente({ nome: this.nome, cpf: this.cpf, nascimento: this.nascimento });
    this.router.navigateByUrl('/gravar-audio');
  }
}
