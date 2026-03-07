import { Injectable } from '@angular/core';
import { Reporte } from '../models/reporte.model';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {

  // 🔹 Datos simulados (como si vinieran de la BD)
  private reportesMock: Reporte[] = [
    {
      id: 1,
      placaAgente: 'AT-123',
      fecha: '2026-02-05',
      hora: '14:30',
      ubicacion: 'Carrera 14 con Calle 21',
      tipoIncidente: 'Accidente vehicular',
      descripcion: 'Atendió colisión entre motocicleta y automóvil',
      resenaCiudadano: 'Atención rápida y profesional'
    },
    {
      id: 2,
      placaAgente: 'AT-123',
      fecha: '2026-02-04',
      hora: '09:10',
      ubicacion: 'Avenida Bolívar con Calle 10',
      tipoIncidente: 'Infracción de tránsito',
      descripcion: 'Control de documentos',
      resenaCiudadano: 'Correcto y respetuoso'
    }
  ];

  constructor() {}

  /**
   * Obtiene el historial de reportes de un agente por placa
   */
  obtenerReportesPorAgente(placa: string): Observable<Reporte[]> {
    const reportesFiltrados = this.reportesMock.filter(
      r => r.placaAgente === placa
    );

    return of(reportesFiltrados);
  }
}
