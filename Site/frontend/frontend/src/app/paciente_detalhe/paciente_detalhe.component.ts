import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService, CreatePatientRequest, PatientDetail } from '../shared/api.service';
import { StateService } from '../shared/state.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

@Component({
  selector: 'app-paciente-detalhe',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './paciente_detalhe.component.html',
  styleUrls: ['./paciente_detalhe.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PacienteDetalheComponent implements OnInit, OnDestroy {
  paciente?: PatientDetail;
  loading = true;
  errorMessage = '';
  editing = false;
  saving = false;
  deleting = false;
  statusMessage = '';
  statusType: 'success' | 'error' | '' = '';

  form: FormGroup;

  private subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private stateService: StateService,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      cpf: ['', [Validators.required, Validators.maxLength(20)]],
      date_of_birth: [''],
      phone: ['', [Validators.maxLength(20)]],
    });
    this.form.disable({ emitEvent: false });
  }

  ngOnInit(): void {
    this.subscription.add(
      this.route.paramMap.subscribe((params) => {
        const idParam = params.get('id');
        if (!idParam) {
          this.errorMessage = 'Paciente não encontrado.';
          this.loading = false;
          return;
        }

        const pacienteId = Number(idParam);
        if (Number.isNaN(pacienteId)) {
          this.errorMessage = 'Identificador inválido.';
          this.loading = false;
          return;
        }

        this.fetchPaciente(pacienteId);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private fetchPaciente(id: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.subscription.add(
      this.apiService.getPatientById(id).subscribe({
        next: (paciente) => {
          this.paciente = paciente;
          this.loading = false;
          this.populateForm(paciente);
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (error.status === 404) {
            this.errorMessage = 'Paciente não encontrado.';
          } else if (error.status === 401) {
            this.errorMessage = 'Sua sessão expirou. Faça login novamente.';
          } else {
            this.errorMessage = 'Não foi possível carregar os dados do paciente. Tente novamente mais tarde.';
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
      })
    );
  }

  iniciarEdicao(): void {
    if (!this.paciente) return;
    this.editing = true;
    this.statusMessage = '';
    this.statusType = '';
    this.form.enable({ emitEvent: false });
    this.cdr.markForCheck();
  }

  cancelarEdicao(): void {
    if (!this.paciente) return;
    this.editing = false;
    this.saving = false;
    this.populateForm(this.paciente);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.disable({ emitEvent: false });
    this.cdr.markForCheck();
  }

  salvarEdicao(): void {
    if (!this.paciente || this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    const doctorId = this.paciente.doctor ?? Number(localStorage.getItem('doctor_id'));
    if (!doctorId) {
      this.statusMessage = 'Não foi possível identificar o médico. Faça login novamente.';
      this.statusType = 'error';
      this.cdr.markForCheck();
      return;
    }

    const payload: CreatePatientRequest = {
      doctor: doctorId,
      name: this.form.value.name,
      email: this.form.value.email,
      cpf: this.form.value.cpf,
      date_of_birth: this.form.value.date_of_birth || '',
      phone: this.form.value.phone || '',
    };

    this.saving = true;
    this.statusMessage = '';
    this.statusType = '';
    this.cdr.markForCheck();

    this.subscription.add(
      this.apiService.updatePatient(this.paciente.id, payload).subscribe({
        next: (atualizado) => {
          this.paciente = atualizado;
          this.editing = false;
          this.saving = false;
          this.populateForm(atualizado);
          this.statusMessage = 'Dados do paciente atualizados com sucesso.';
          this.statusType = 'success';
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.saving = false;
          if (error.status === 400) {
            this.statusMessage = 'Verifique os dados informados. Alguns campos podem estar inválidos.';
          } else if (error.status === 401) {
            this.statusMessage = 'Sua sessão expirou. Faça login novamente.';
          } else {
            this.statusMessage = 'Não foi possível atualizar o paciente. Tente novamente.';
          }
          this.statusType = 'error';
          this.cdr.markForCheck();
        },
      })
    );
  }

  excluirPaciente(): void {
    if (!this.paciente) return;
    const confirmar = window.confirm(`Tem certeza que deseja remover ${this.paciente.name}? Essa ação não pode ser desfeita.`);
    if (!confirmar) return;

    this.deleting = true;
    this.cdr.markForCheck();

    this.subscription.add(
      this.apiService.deletePatient(this.paciente.id).subscribe({
        next: () => {
          this.deleting = false;
          this.cdr.markForCheck();
          this.router.navigate(['/pacientes']);
        },
        error: (error) => {
          this.deleting = false;
          if (error.status === 401) {
            this.statusMessage = 'Sua sessão expirou. Faça login novamente.';
          } else if (error.status === 404) {
            this.statusMessage = 'Paciente não encontrado ou já removido.';
          } else {
            this.statusMessage = 'Não foi possível remover o paciente. Tente novamente.';
          }
          this.statusType = 'error';
          this.cdr.markForCheck();
        },
      })
    );
  }

  campoInvalido(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  iniciarNovaConsulta(): void {
    if (!this.paciente) return;
    
    // Set patient data in StateService
    this.stateService.setPaciente({
      nome: this.paciente.name,
      cpf: this.paciente.cpf || '',
      nascimento: this.paciente.date_of_birth || ''
    });
    
    // Navigate to recording screen
    this.router.navigate(['/gravar-audio']);
  }

  private populateForm(paciente: PatientDetail): void {
    this.form.patchValue(
      {
        name: paciente.name ?? '',
        email: paciente.email ?? '',
        cpf: paciente.cpf ?? '',
        date_of_birth: paciente.date_of_birth ?? '',
        phone: paciente.phone ?? '',
      },
      { emitEvent: false }
    );
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.disable({ emitEvent: false });
  }
}
