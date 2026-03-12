import { Injectable } from '@angular/core';
import { Reporte } from '../models/reporte.model';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReportesService {
  // 🔹 Datos simulados (como si vinieran de la BD)
  private reportesMock: Reporte[] = [];
  private api = 'http://localhost:8080/api/reportes';

  constructor() {}

  /**
   * Obtiene el historial de reportes de un agente por placa
   */
  obtenerReportesPorAgente(placa: string): Observable<Reporte[]> {
    const reportesFiltrados = this.reportesMock.filter(
      (r) => r.placaAgente === placa,
    );

    return of(reportesFiltrados);
  }

  obtenerReportes() {
    return fetch(this.api).then((res) => res.json());
  }
}
