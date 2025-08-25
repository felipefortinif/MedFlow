import { Routes } from '@angular/router';
import { TelaPrincipalComponent } from './tela_principal/tela_principal.component';
import { GravarAudioComponent } from './gravar_audio/gravar_audio.component';
import { ProntuarioComponent } from './prontuario/prontuario.component';
import { TelaTeste } from './teste/tela_teste.component';

export const routes: Routes = [
	{ path: '', redirectTo: 'tela-principal', pathMatch: 'full' },
	{ path: 'tela-principal', component: TelaPrincipalComponent },
	{ path: 'gravar-audio', component: GravarAudioComponent },
	{ path: 'prontuario', component: ProntuarioComponent },
	{ path: 'tela-teste', component: TelaTeste},
	{ path: '**', redirectTo: 'tela-principal' }
];
