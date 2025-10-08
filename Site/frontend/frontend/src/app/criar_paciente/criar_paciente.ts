import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ApiService, DoctorProfile } from '../shared/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-criar-paciente',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './criar_paciente.html',
    styleUrls: ['./criar_paciente.css']
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

    constructor(private api: ApiService, private router: Router) { }

    todayISO(): string {
        return new Date().toISOString().split('T')[0];
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
        if (!this.name || !this.email || !this.cpf || !this.date_of_birth || !this.phone) {
            this.error = 'Preencha todos os campos.';
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
            await firstValueFrom(this.api.createPatient({
                doctor,
                name: this.name.trim(),
                email: this.email.trim(),
                cpf: this.cpf.trim(),
                date_of_birth: this.date_of_birth,
                phone: this.phone.trim()
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