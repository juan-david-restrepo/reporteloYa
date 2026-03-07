import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Usuario {
  id: number;
  nombreCompleto: string;
  email: string;
  numeroDocumento: string;
  tipoDocumento: string;
  role: string;
  telefono: string;
  placa?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AgenteServiceTs {

  private apiAgente = 'http://localhost:8080/agente';
  private apiReportes = 'http://localhost:8080/api/reportes';

  constructor(private http: HttpClient) {}

  // =============================
  // PERFIL DEL AGENTE
  // =============================
  getPerfil(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiAgente}/perfil`, {
      withCredentials: true
    });
  }

  // =============================
  // REPORTES ASIGNADOS AL AGENTE
  // =============================
  getReportesAgente(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiReportes}/agente`, {
      withCredentials: true
    });
  }

  // =============================
  // TOMAR REPORTE
  // =============================
  tomarReporte(id: number): Observable<any> {
    return this.http.post(
      `${this.apiReportes}/tomar/${id}`,
      {},
      { withCredentials: true }
    );
  }

}