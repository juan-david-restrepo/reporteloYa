import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Agente } from '../models/agente.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private apiUrl = 'http://localhost:8080/admin/agentes';

  constructor(private http: HttpClient) {}

  // ===============================
  // OBTENER TODOS
  // ===============================
  obtenerAgentes(): Observable<Agente[]> {
    return this.http.get<Agente[]>(this.apiUrl, {
      withCredentials: true
    });
  }

  // ===============================
  // BUSCAR POR PLACA
  // ===============================
  obtenerAgentePorPlaca(placa: string): Observable<Agente> {
    const normalizada = (placa ?? '').trim().toUpperCase();
    return this.http.get<Agente>(
      `${this.apiUrl}/${encodeURIComponent(normalizada)}`,
      { withCredentials: true }
    );
  }

  actualizarEstado(
    placa: string,
    estado: 'DISPONIBLE' | 'OCUPADO' | 'AUSENTE'
  ): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${placa}`,
      { estado },
      { withCredentials: true }
    );
  }
}