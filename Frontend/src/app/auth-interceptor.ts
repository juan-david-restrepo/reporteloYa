import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => { // se crea el interceptor y angular la ejecuta en automatico

  const token = localStorage.getItem('token'); // el token se guarda en el local de el navegador y lo estraemos de ahi

  if(token){ // si el token no existe el usuario no esta logueado
    const authReq = req.clone({ // las peticiones en angular no se pueden modificar por eso se clona la peticion y se le agrega el token en el header
      setHeaders:{ //este es el formato que espera el backend para el token
        Authorization: `Bearer ${token}`
      }
    });

    return next(authReq); // si todo esta bien se envia normal a el backend
  }

  return next(req); // se deja pasar la peticion original sin modificarla
};

