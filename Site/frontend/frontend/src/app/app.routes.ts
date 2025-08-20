import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', redirectTo: '/esquerda', pathMatch: 'full' },
	{
		path: 'esquerda',
		loadComponent: () => import('./left-page/left-page.component').then((m) => m.LeftPageComponent),
	},
	{
		path: 'direita',
		loadComponent: () => import('./right-page/right-page.component').then((m) => m.RightPageComponent),
	},
];
