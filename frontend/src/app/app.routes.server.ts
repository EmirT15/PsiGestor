import {
  RenderMode,
  ServerRoute
} from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'portal-alumno',
    renderMode: RenderMode.Client
  },

  {
    path: 'calendar',
    renderMode: RenderMode.Prerender
  },

  {
    path: 'patient/availability',
    renderMode: RenderMode.Prerender
  },

  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
