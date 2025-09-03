import { Routes } from '@angular/router';
import { TelaPrincipalComponent } from './tela_principal/tela_principal.component';
import { GravarAudioComponent } from './gravar_audio/gravar_audio.component';
import { ProntuarioComponent } from './prontuario/prontuario.component';
import { TelaTeste } from './teste/tela_teste.component';
import { AuthComponent } from './auth/auth.component';
import { PacientesComponent } from './pacientes/pacientes.component';

export const routes: Routes = [
	{ path: '', redirectTo: 'login', pathMatch: 'full' },
	{ path: 'login', component: AuthComponent },
	{ path: 'pacientes', component: PacientesComponent },
	{ path: 'tela-principal', component: TelaPrincipalComponent },
	{ path: 'gravar-audio', component: GravarAudioComponent },
	{ path: 'prontuario', component: ProntuarioComponent },
	{ path: 'tela-teste', component: TelaTeste},
	{ path: '**', redirectTo: 'pacientes' }
];
