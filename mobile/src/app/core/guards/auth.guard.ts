import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()) {
    return true;
  }

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
      // Redirigir a la vista móvil correspondiente si no coincide el rol
      if (user.role === 'psicologo') {
        return router.createUrlTree(['/psicologo']);
      }
      return router.createUrlTree(['/tabs']);
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
    if (user.role === 'psicologo') {
      return router.createUrlTree(['/psicologo']);
    }
    return router.createUrlTree(['/tabs']);
  };

  if (authService.currentUser()) {
    return checkGuest(authService.currentUser());
  }

  return authService.checkSession().pipe(
    map(user => checkGuest(user))
  );
};
