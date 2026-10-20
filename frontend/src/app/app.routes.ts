import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'calendar',

    loadComponent: () =>
      import(
        './features/calendar/components/calendar/calendar'
      )
        .then(
          (m) => m.Calendar
        )
  },

  {
    path: 'patient/availability',

    loadComponent: () =>
      import(
        './features/patient/pages/availability/availability'
      )
        .then(
          (m) => m.Availability
        )
  }
];