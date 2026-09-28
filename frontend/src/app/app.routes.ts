import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'calendar',
    loadComponent: () =>
      import('./features/calendar/components/calendar/calendar')
        .then((m) => m.Calendar)
  }
];