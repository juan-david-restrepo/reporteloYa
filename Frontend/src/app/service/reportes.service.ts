import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Reporte } from '../models/reporte.model';

@Injectable({
  providedIn: 'root',
})
export class ReportesService {


  private api = 'http://localhost:8080/admin';
  private apiUrl = 'http://localhost:8080/api/reportes/todos';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el historial de reportes de un agente por placa
   */
  obtenerReportesPorAgente(placa: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/${placa}/reportes`, { withCredentials: true });
  }
  

  obtenerReportes() {
    return fetch(this.apiUrl).then((res) => res.json());
  }
}
