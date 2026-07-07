import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'Tig Music — a songwriting studio',
  },
  {
    path: 'songs',
    canActivate: [authGuard],
    loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
    title: 'Your songs — Tig Music',
  },
  {
    path: 'songs/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/workbench/workbench').then((m) => m.Workbench),
    title: 'Workbench — Tig Music',
  },
  {
    path: 'songs/:id/chart',
    canActivate: [authGuard],
    loadComponent: () => import('./features/chart/chart').then((m) => m.ChartView),
    title: 'Chart — Tig Music',
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about').then((m) => m.About),
    title: 'About — Tig Music',
  },
  { path: '**', redirectTo: '' },
];
