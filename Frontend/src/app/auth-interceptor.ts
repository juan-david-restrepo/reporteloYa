import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('http')) {
    req = req.clone({
      url: 'http://localhost:8080' + req.url
    });
  }

  return next(req.clone({
    withCredentials: true
  }));
};
