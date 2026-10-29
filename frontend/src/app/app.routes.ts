import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'calendar' // TEMPORAL: Redirigir directo al calendario mientras se desarrolla
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then((m) => m.Login)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register')
        .then((m) => m.Register)
  },
  {
    path: 'calendar',
    // canActivate: [roleGuard(['psicologo'])], // TEMPORAL: Desactivado para entrar directo
    loadComponent: () =>
      import('./features/calendar/components/calendar/calendar')
        .then((m) => m.Calendar)
  },
  {
    path: 'portal-alumno',
    loadComponent: () =>
      import('./features/patient/student-portal/portal-alumno/portal-alumno')
        .then((m) => m.PortalAlumno)
  },
  {
    path: 'patient/availability',
    loadComponent: () =>
      import('./features/patient/pages/availability/availability')
        .then((m) => m.Availability)
  },
  {
    path: 'psychologist',
    loadComponent: () => 
      import('./features/psychologist/psychologist-layout.component')
        .then(m => m.PsychologistLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'calendar',
        pathMatch: 'full'
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/components/calendar/calendar')
            .then((m) => m.Calendar)
      }
      
    ]
  },
  {
    path: '**',
    redirectTo: 'calendar'
  }
];