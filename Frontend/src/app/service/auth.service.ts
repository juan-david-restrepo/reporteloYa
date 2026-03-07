import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';

  // 🔹 Estado de autenticación global
  private authState = new BehaviorSubject<boolean>(false);
  authState$ = this.authState.asObservable();

  // 🔹 Usuario actual global
  private currentUser = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUser.asObservable();

  // 🔹 Saber si ya intentamos cargar sesión al iniciar la app
  private loading = new BehaviorSubject<boolean>(true);
  loading$ = this.loading.asObservable();

  constructor(private http: HttpClient) {
    // 🔹 Intentar cargar sesión desde cookie al iniciar app
    this.refreshUser().subscribe(() => this.loading.next(false));
  }


login(email: string, password: string): Observable<any> {
  return this.http.post(
    `${this.apiUrl}/login`,
    { email, password },
    { withCredentials: true }
  ).pipe(
    tap(() => {
      this.refreshUser().subscribe();
    })
  );
}

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data, {
      withCredentials: true,
    });
  }

logout(): Observable<any> {
  return this.http
    .post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
    .pipe(
      tap(() => {
        this.clearUserState(); // 🔥 ESTA ES LA CLAVE
      })
    );
}



  // =========================
  // REFRESCAR USUARIO DESDE COOKIE (/me)
  // =========================
  refreshUser(): Observable<AuthUser | null> {
    return this.http.get<AuthUser>(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
      tap(user => {
        if (user && user.userId) {
          this.currentUser.next(user);
          this.authState.next(true);

          // 🔹 Guardar solo para UI/localStorage, no JWT
          localStorage.setItem('userId', user.userId);
          localStorage.setItem('email', user.email);
          localStorage.setItem('role', user.role);
        } else {
          this.clearUserState();
        }
      }),
      catchError(err => {
        console.error('refreshUser error', err);
        this.clearUserState();
        return of(null);
      })
    );
  }

  // =========================
  // GETTERS SÍNCRONOS
  // =========================
  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`, {
      withCredentials: true,
    });
  }


  getUserId(): string | null {
    return this.currentUser.value?.userId || null;
  }

  getUserRole(): string | null {
    return this.currentUser.value?.role || null;
  }


  // =========================

    setAuthenticated(isAuth: boolean) {
    this.authState.next(isAuth);
  }


  // =========================
  // LIMPIAR ESTADO DE USUARIO
  // =========================
  private clearUserState() {
    this.currentUser.next(null);
    this.authState.next(false);
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
  }


  
}