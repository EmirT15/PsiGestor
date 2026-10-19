import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login')
        .then((m) => m.Login)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register')
        .then((m) => m.Register)
  },
  {
    path: 'calendar',
    canActivate: [roleGuard(['psicologo'])],
    loadComponent: () =>
      import('./features/calendar/components/calendar/calendar')
        .then((m) => m.Calendar)
  },
  {
    path: 'portal-alumno',
    canActivate: [roleGuard(['alumno'])],
    loadComponent: () =>
      import('./features/student-portal/portal-alumno/portal-alumno')
        .then((m) => m.PortalAlumno)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];