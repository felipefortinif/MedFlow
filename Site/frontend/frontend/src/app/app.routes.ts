import { Routes } from '@angular/router';
import { GravarAudioComponent } from './gravar_audio/gravar_audio.component';
import { AuthComponent } from './auth/auth.component';
import { PacientesComponent } from './pacientes/pacientes.component';
import { authGuard } from './shared/auth.guard';
import { CriaPacienteComponent } from './criar_paciente/criar_paciente.component';
import { PacienteDetalheComponent } from './paciente_detalhe/paciente_detalhe.component';


export const routes: Routes = [
	{ path: '', redirectTo: 'login', pathMatch: 'full' },
	{ path: 'login', component: AuthComponent },
	{ path: 'pacientes', component: PacientesComponent, canActivate: [authGuard] },
	{ path: 'pacientes/:id', component: PacienteDetalheComponent, canActivate: [authGuard] },
	{ path: 'criar-paciente', component: CriaPacienteComponent, canActivate: [authGuard] },
	{ path: 'gravar-audio', component: GravarAudioComponent, canActivate: [authGuard] },
	{ path: '**', redirectTo: 'login' }
];