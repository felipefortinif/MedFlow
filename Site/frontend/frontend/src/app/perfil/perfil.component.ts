import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, DoctorProfile, UpdateDoctorProfileRequest } from '../shared/api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

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

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      email: [{ value: '', disabled: true }], // Email não é editável (PK)
      cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      date_of_birth: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10,11}$/)]],
      crm: ['', Validators.required],
      specialty: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.getDoctorProfile().subscribe({
      next: (profile: DoctorProfile) => {
        this.doctorData = profile;
        
        // Preenche o formulário com os dados do perfil
        if (profile.profile) {
          this.profileForm.patchValue({
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.profile.email || '',
            cpf: profile.profile.cpf || '',
            date_of_birth: profile.profile.date_of_birth || '',
            phone: profile.profile.phone || '',
            crm: profile.profile.crm || '',
            specialty: profile.profile.specialty || ''
          });
        }
        
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

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.errorMessage = 'Por favor, preencha todos os campos corretamente.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Não envia o email pois é read-only (PK)
    const formData: UpdateDoctorProfileRequest = {
      first_name: this.profileForm.get('first_name')?.value,
      last_name: this.profileForm.get('last_name')?.value,
      cpf: this.profileForm.get('cpf')?.value,
      date_of_birth: this.profileForm.get('date_of_birth')?.value,
      phone: this.profileForm.get('phone')?.value,
      crm: this.profileForm.get('crm')?.value,
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
