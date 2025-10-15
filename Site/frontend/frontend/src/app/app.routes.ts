import { Routes } from '@angular/router';
import { AdicionarPacienteComponent } from './adicionar_paciente/adicionar_paciente.component';
import { GravarAudioComponent } from './gravar_audio/gravar_audio.component';
import { ProntuarioComponent } from './prontuario/prontuario.component';
import { AuthComponent } from './auth/auth.component';
import { PacientesComponent } from './pacientes/pacientes.component';
import { authGuard } from './shared/auth.guard';
import { CriaPacienteComponent } from './criar_paciente/criar_paciente';
import { PacienteDetalheComponent } from './paciente_detalhe/paciente_detalhe.component';


export const routes: Routes = [
	{ path: '', redirectTo: 'login', pathMatch: 'full' },
	{ path: 'login', component: AuthComponent },
	{ path: 'pacientes', component: PacientesComponent, canActivate: [authGuard] },
	{ path: 'pacientes/:id', component: PacienteDetalheComponent, canActivate: [authGuard] },
	{ path: 'adicionar-paciente', component: AdicionarPacienteComponent, canActivate: [authGuard] },
	{ path: 'gravar-audio', component: GravarAudioComponent, canActivate: [authGuard] },
	{ path: 'prontuario', component: ProntuarioComponent, canActivate: [authGuard] },
	{ path: 'criar-paciente', component: CriaPacienteComponent, canActivate: [authGuard] },
	{ path: '**', redirectTo: 'login' }
];