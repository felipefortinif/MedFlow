import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ApiService, CreatePatientRequest, PatientDetail, Prontuario } from '../shared/api.service';
import { StateService } from '../shared/state.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { formatDate } from '../shared/date.utils';
import { markdownToHtml as convertMarkdownToHtml } from '../shared/markdown.utils';
import {
  cpfValidator,
  phoneValidator,
  patientBirthDateValidator,
  emailValidator,
  onlyNumbers
} from '../shared/validators';

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
  loadingLatestProntuario = false;
  latestProntuario?: Prontuario;
  latestProntuarioError = '';
  showProntuariosModal = false;
  loadingProntuariosList = false;
  prontuariosList: Prontuario[] = [];
  prontuariosListError = '';
  selectedProntuario?: Prontuario;

  form: FormGroup;

  private subscription = new Subscription();

  // Expor funções para o template
  onlyNumbers = onlyNumbers;

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private stateService: StateService,
    private sanitizer: DomSanitizer,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      email: ['', [Validators.required, emailValidator(), Validators.maxLength(254)]],
      cpf: ['', [Validators.required, cpfValidator()]],
      date_of_birth: ['', [patientBirthDateValidator()]],
      phone: ['', [phoneValidator()]],
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
          this.fetchLatestProntuario(paciente.id);
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
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
      
      // Mostra primeiro erro encontrado
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        if (control?.invalid && control.errors) {
          const firstError = Object.values(control.errors)[0];
          if (typeof firstError === 'object' && 'message' in firstError) {
            this.statusMessage = (firstError as any).message;
            this.statusType = 'error';
          }
        }
      });
      
      if (!this.statusMessage) {
        this.statusMessage = 'Por favor, preencha todos os campos corretamente.';
        this.statusType = 'error';
      }
      
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

    // Sanitiza dados antes de enviar
    const payload: CreatePatientRequest = {
      doctor: doctorId,
      name: this.form.value.name?.trim(),
      email: this.form.value.email?.trim().toLowerCase(),
      cpf: this.form.value.cpf?.replace(/\D/g, ''), // Remove formatação
      date_of_birth: this.form.value.date_of_birth || '',
      phone: this.form.value.phone?.replace(/\D/g, '') || '', // Remove formatação
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
        error: (error: HttpErrorResponse) => {
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
        error: (error: HttpErrorResponse) => {
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

    const storedDoctorIdRaw = localStorage.getItem('doctor_id');
    const storedDoctorId = storedDoctorIdRaw ? Number(storedDoctorIdRaw) : NaN;
    const doctorId = Number.isFinite(this.paciente.doctor)
      ? this.paciente.doctor
      : Number.isFinite(storedDoctorId) ? storedDoctorId : null;

    // Set patient data in StateService
    this.stateService.setPaciente({
      id: this.paciente.id,
      doctorId,
      nome: this.paciente.name,
      cpf: this.paciente.cpf || '',
      nascimento: this.paciente.date_of_birth || ''
    });

    // Navigate to recording screen
    this.router.navigate(['/gravar-audio']);
  }

  mostrarTodosProntuarios(): void {
    if (!this.paciente) return;
    this.showProntuariosModal = true;
    this.loadingProntuariosList = true;
    this.prontuariosListError = '';
    this.prontuariosList = [];
    this.selectedProntuario = undefined;
    this.cdr.markForCheck();

    this.subscription.add(
      this.apiService.getProntuariosList(this.paciente.id).subscribe({
        next: (lista: Prontuario[]) => {
          this.prontuariosList = [...lista].sort((a, b) => this.getDateValue(b.created_at) - this.getDateValue(a.created_at));
          this.selectedProntuario = this.prontuariosList[0];
          this.loadingProntuariosList = false;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.loadingProntuariosList = false;
          if (error.status === 404) {
            this.prontuariosListError = 'Nenhum prontuário encontrado para este paciente.';
          } else if (error.status === 401) {
            this.prontuariosListError = 'Sua sessão expirou. Faça login novamente.';
          } else {
            this.prontuariosListError = 'Não foi possível carregar os prontuários. Tente novamente.';
          }
          this.cdr.markForCheck();
        },
      })
    );
  }

  fecharProntuariosModal(): void {
    this.showProntuariosModal = false;
    this.cdr.markForCheck();
  }

  selecionarProntuario(prontuario: Prontuario): void {
    this.selectedProntuario = prontuario;
    this.cdr.markForCheck();
  }

  formatarDataProntuario(prontuario?: Prontuario): string {
    if (!prontuario) return '';
    const date = new Date(prontuario.created_at);
    if (Number.isNaN(date.getTime())) return '';
    return formatDate(date, { dateStyle: 'medium', timeStyle: 'short' });
  }

  trackProntuario(index: number, prontuario: Prontuario): number {
    return index;
  }

  /**
   * Converte markdown para HTML formatado
   */
  markdownToHtml(markdown: string): SafeHtml {
    const html = convertMarkdownToHtml(markdown);
    return this.sanitizer.bypassSecurityTrustHtml(html);
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

  private fetchLatestProntuario(patientId: number): void {
    this.loadingLatestProntuario = true;
    this.latestProntuario = undefined;
    this.latestProntuarioError = '';
    this.cdr.markForCheck();

    this.subscription.add(
      this.apiService.getLatestProntuario(patientId).subscribe({
        next: (prontuario: Prontuario) => {
          this.latestProntuario = prontuario;
          this.loadingLatestProntuario = false;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.loadingLatestProntuario = false;
          if (error.status === 404) {
            this.latestProntuarioError = 'Nenhum prontuário encontrado para este paciente.';
          } else if (error.status === 401) {
            this.latestProntuarioError = 'Sua sessão expirou. Faça login novamente.';
          } else {
            this.latestProntuarioError = 'Não foi possível carregar o prontuário. Tente novamente mais tarde.';
          }
          this.cdr.markForCheck();
        },
      })
    );
  }

  private getDateValue(dateIso: string): number {
    const value = new Date(dateIso).getTime();
    return Number.isNaN(value) ? 0 : value;
  }
}
