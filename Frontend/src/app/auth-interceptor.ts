import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Las cookies JWT se envían automáticamente con withCredentials: true
  // No es necesario leer el token desde localStorage
  // El backend está configurado para usar cookies HttpOnly
  
  return next(req);
};
