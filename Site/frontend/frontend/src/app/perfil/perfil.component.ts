import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, DoctorProfile, UpdateDoctorProfileRequest, Specialty } from '../shared/api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import {
  cpfValidator,
  phoneValidator,
  birthDateValidator,
  crmValidator,
  onlyNumbers,
  formatCPF,
  formatPhone
} from '../shared/validators';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  profileForm: FormGroup;
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  doctorData?: DoctorProfile;
  specialties: Specialty[] = [];

  // Expor funções para o template
  onlyNumbers = onlyNumbers;

  // Retorna data de hoje no formato YYYY-MM-DD para o atributo max do input date
  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      last_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: [{ value: '', disabled: true }],
      cpf: ['', [Validators.required, cpfValidator()]],
      date_of_birth: ['', [Validators.required, birthDateValidator()]],
      phone: ['', [Validators.required, phoneValidator()]],
      crm: ['', [Validators.required, crmValidator()]],
      specialty: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadSpecialties();
    this.loadProfile();
  }

  loadSpecialties(): void {
    this.apiService.getSpecialtiesList().subscribe({
      next: (specialties: Specialty[]) => {
        this.specialties = specialties;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erro ao carregar especialidades:', error);
        // Não bloqueia o carregamento do perfil
      }
    });
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.getDoctorProfile().subscribe({
      next: (profile: DoctorProfile) => {
        this.doctorData = profile;
        
        // Preenche o formulário com os dados do perfil
        this.profileForm.patchValue({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: profile.email || '', // email vem diretamente do user
          cpf: profile.profile?.cpf || '',
          date_of_birth: profile.profile?.date_of_birth || '',
          phone: profile.profile?.phone || '',
          crm: profile.profile?.crm || '',
          specialty: (profile.profile?.specialty ?? null)
        });
        
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        if (error.status === 401) {
          this.errorMessage = 'Sessão expirada. Faça login novamente.';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        } else {
          this.errorMessage = 'Erro ao carregar perfil. Tente novamente.';
        }
        this.cdr.markForCheck();
      }
    });
  }

  // Sanitiza CPF: remove formatação, mantém apenas dígitos
  sanitizeCPF(value: string): string {
    return value ? value.replace(/\D/g, '') : '';
  }

  // Sanitiza telefone: remove formatação, mantém apenas dígitos
  sanitizePhone(value: string): string {
    return value ? value.replace(/\D/g, '') : '';
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      // Mostra primeiro erro encontrado
      Object.keys(this.profileForm.controls).forEach(key => {
        const control = this.profileForm.get(key);
        if (control?.invalid && control.errors) {
          const firstError = Object.values(control.errors)[0];
          if (typeof firstError === 'object' && 'message' in firstError) {
            this.errorMessage = (firstError as any).message;
          }
        }
      });
      if (!this.errorMessage) {
        this.errorMessage = 'Por favor, preencha todos os campos corretamente.';
      }
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Sanitiza campos antes de enviar (remove formatação)
    const formData: UpdateDoctorProfileRequest = {
      first_name: this.profileForm.get('first_name')?.value?.trim(),
      last_name: this.profileForm.get('last_name')?.value?.trim(),
      cpf: this.sanitizeCPF(this.profileForm.get('cpf')?.value),
      date_of_birth: this.profileForm.get('date_of_birth')?.value,
      phone: this.sanitizePhone(this.profileForm.get('phone')?.value),
      crm: this.profileForm.get('crm')?.value?.trim()?.toUpperCase(),
      specialty: this.profileForm.get('specialty')?.value
    };

    this.apiService.updateDoctorProfile(formData).subscribe({
      next: (response) => {
        this.saving = false;
        this.successMessage = 'Perfil atualizado com sucesso!';
        
        // Atualiza os dados locais
        if (response.doctor) {
          this.doctorData = response.doctor;
        }
        
        this.cdr.markForCheck();
        
        // Limpa a mensagem de sucesso após 3 segundos
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 3000);
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        
        if (error.status === 401) {
          this.errorMessage = 'Sessão expirada. Faça login novamente.';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        } else if (error.status === 400) {
          this.errorMessage = 'Dados inválidos. Verifique os campos e tente novamente.';
        } else {
          this.errorMessage = 'Erro ao atualizar perfil. Tente novamente.';
        }
        
        this.cdr.markForCheck();
      }
    });
  }

  voltar(): void {
    this.router.navigate(['/pacientes']);
  }
}
