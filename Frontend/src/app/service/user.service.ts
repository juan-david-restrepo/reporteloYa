import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Usuario {
  nombreCompleto: string;
  email: string;
  password?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  // API apuntando solo a ciudadano
  private apiUrl = 'http://localhost:8080/api/ciudadano';

  constructor(private http: HttpClient) {}

  // ================= GET perfil =================
  // Usa la cookie HttpOnly para autenticar
  getProfile(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/profile`, { withCredentials: true });
  }

  // ================= GET total de reportes =================
  // Ya no necesitamos token en headers, solo la cookie
  getTotalReportes(): Observable<{ total_reportes: number }> {
    return this.http.get<{ total_reportes: number }>(`${this.apiUrl}/reportes/total`, {
      withCredentials: true
    });
  }

  // ================= PUT actualizar perfil =================
  // Actualiza perfil usando la cookie HttpOnly
  updateProfile(data: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/profile`, data, {
      withCredentials: true
    });
  }
}