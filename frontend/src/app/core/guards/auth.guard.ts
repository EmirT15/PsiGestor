import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si ya tenemos el usuario en la señal
  if (authService.currentUser()) {
    return true;
  }

  // Si aún no se ha verificado, consultamos sesión al backend
  return authService.checkSession().pipe(
    map(user => {
      if (user) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};

export const roleGuard = (allowedRoles: Array<'psicologo' | 'alumno'>): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const checkRole = (user: any) => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }
      if (allowedRoles.includes(user.role)) {
        return true;
      }
      // Redirigir a la vista que le corresponde si no tiene permiso para esta ruta
      if (user.role === 'psicologo') {
        return router.createUrlTree(['/calendar']);
      }
      return router.createUrlTree(['/portal-alumno']);
    };

    if (authService.currentUser()) {
      return checkRole(authService.currentUser());
    }

    return authService.checkSession().pipe(
      map(user => checkRole(user))
    );
  };
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const checkGuest = (user: any) => {
    if (!user) {
      return true;
    }
    // Si ya está autenticado, redirigir según su rol
    if (user.role === 'psicologo') {
      return router.createUrlTree(['/calendar']);
    }
    return router.createUrlTree(['/portal-alumno']);
  };

  if (authService.currentUser()) {
    return checkGuest(authService.currentUser());
  }

  return authService.checkSession().pipe(
    map(user => checkGuest(user))
  );
};
