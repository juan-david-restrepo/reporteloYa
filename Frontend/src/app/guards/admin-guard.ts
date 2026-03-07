import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  if (role !== 'ADMIN') {
    router.navigate(['/home']);
    return false;
  }

  return true;
};
