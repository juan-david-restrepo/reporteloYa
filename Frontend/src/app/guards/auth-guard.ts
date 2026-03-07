import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { Router } from '@angular/router';
import { map } from 'rxjs/internal/operators/map';
import { catchError, of } from 'rxjs';



export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getCurrentUser().pipe(
    map(() => {
      //  Sincronizamos estado global
      authService.setAuthenticated(true);
      return true;
    }),

    catchError(() => {
      authService.setAuthenticated(false);
      router.navigate(['/login']);
      return of(false);
    }),
  );
};