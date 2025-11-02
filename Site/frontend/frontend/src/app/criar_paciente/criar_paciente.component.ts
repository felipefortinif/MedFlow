import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ApiService, DoctorProfile } from '../shared/api.service';
import { firstValueFrom } from 'rxjs';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { onlyNumbers } from '../shared/validators';

@Component({
    selector: 'app-criar-paciente',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './criar_paciente.component.html',
    styleUrls: ['./criar_paciente.component.css']
})
export class CriaPacienteComponent {
    name = '';
    email = '';
    cpf = '';
    date_of_birth = '';
    phone = '';

    submitting = false;
    error = '';
    success = '';

    onlyNumbers = onlyNumbers;

    constructor(private api: ApiService, private router: Router) { }

    todayISO(): string {
        return new Date().toISOString().split('T')[0];
    }

    validateCPF(cpf: string): boolean {
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cleaned)) return false;

        let sum = 0;
        for (let i = 1; i <= 9; i++) {
            sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
        }
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

        return true;
    }

    validateEmail(email: string): boolean {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return regex.test(email);
    }

    validatePhone(phone: string): boolean {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 11 && cleaned[0] !== '0';
    }

    validateBirthDate(date: string): { valid: boolean; message?: string } {
        if (!date) return { valid: false, message: 'Data obrigatória' };
        
        const birthDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (birthDate > today) {
            return { valid: false, message: 'Data não pode estar no futuro' };
        }

        let age = today.getFullYear() - birthDate.getFullYear();
        if (age > 150) {
            return { valid: false, message: 'Data inválida' };
        }

        return { valid: true };
    }

    private getCSRFToken(): string {
        const name = 'csrftoken=';
        const decodedCookie = decodeURIComponent(document.cookie || '');
        const parts = decodedCookie.split(';');
        for (let c of parts) {
            c = c.trim();
            if (c.indexOf(name) === 0) return c.substring(name.length);
        }
        return '';
    }

    async submit() {
        this.error = '';
        this.success = '';
        
        // Validações
        if (!this.name?.trim() || this.name.trim().length < 2) {
            this.error = 'Nome deve ter pelo menos 2 caracteres';
            return;
        }

        if (!this.email || !this.validateEmail(this.email)) {
            this.error = 'Email inválido';
            return;
        }

        if (!this.cpf || !this.validateCPF(this.cpf)) {
            this.error = 'CPF inválido';
            return;
        }

        const birthDateValidation = this.validateBirthDate(this.date_of_birth);
        if (!birthDateValidation.valid) {
            this.error = birthDateValidation.message || 'Data de nascimento inválida';
            return;
        }

        if (!this.phone || !this.validatePhone(this.phone)) {
            this.error = 'Telefone inválido (deve ter 10 ou 11 dígitos)';
            return;
        }
        this.submitting = true;
        try {
            const doctor = await this.resolveDoctorId();
            if (doctor === null) {
                this.error = 'Não foi possível identificar o médico. Faça login novamente.';
                return;
            }

            const csrfToken = this.getCSRFToken();
            // Sanitiza dados antes de enviar
            await firstValueFrom(this.api.createPatient({
                doctor,
                name: this.name.trim(),
                email: this.email.trim().toLowerCase(),
                cpf: this.cpf.replace(/\D/g, ''), // Remove formatação
                date_of_birth: this.date_of_birth,
                phone: this.phone.replace(/\D/g, '') // Remove formatação
            }, csrfToken));

            this.success = 'Paciente criado com sucesso.';
            setTimeout(() => this.router.navigateByUrl('/pacientes'), 800);
        } catch (err) {
            const httpErr = err as HttpErrorResponse;
            if (httpErr?.status === 400 && httpErr.error) {
                this.error = 'Dados inválidos.';
            } else if (httpErr?.status === 401) {
                this.error = 'Não autorizado. Faça login novamente.';
                this.router.navigateByUrl('/login');
            } else {
                this.error = 'Falha ao criar paciente.';
            }
        } finally {
            this.submitting = false;
        }
    }

    cancelar() {
        this.router.navigateByUrl('/pacientes');
    }

    private async resolveDoctorId(): Promise<number | null> {
        const cached = localStorage.getItem('doctor_id');
        if (cached) {
            const parsed = Number(cached);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
        try {
            const profile = await firstValueFrom(this.api.getDoctorProfile());
            if (profile && typeof profile.id === 'number') {
                localStorage.setItem('doctor_id', String(profile.id));
                return profile.id;
            }
        } catch {
            // ignorar, deixará retornar null
        }
        return null;
    }
}