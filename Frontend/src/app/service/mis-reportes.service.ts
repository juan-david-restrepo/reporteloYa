import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReporteCiudadano {
  id: number;
  tipoInfraccion: string;
  descripcion: string;
  direccion: string;
  latitud: number;
  longitud: number;
  placa: string;
  estado: string;
  prioridad: string;
  fechaIncidente: string;
  horaIncidente: string;
  createdAt: string;
  updatedAt: string;
  evidencias?: Evidencia[];
  agente?: AgenteInfo;
}

export interface Evidencia {
  id: number;
  tipo: string;
  archivo: string;
}

export interface AgenteInfo {
  id: number;
  nombreCompleto: string;
  placa: string;
}

export interface ReporteEstadisticas {
  total: number;
  pendientes: number;
  enProceso: number;
  finalizados: number;
}

@Injectable({
  providedIn: 'root'
})
export class MisReportesService {
  private apiUrl = 'http://localhost:8080/api/ciudadano';

  constructor(private http: HttpClient) {}

  getMisReportes(): Observable<ReporteCiudadano[]> {
    return this.http.get<ReporteCiudadano[]>(`${this.apiUrl}/mis-reportes`, {
      withCredentials: true
    });
  }

  getEstadisticas(): Observable<ReporteEstadisticas> {
    return this.http.get<ReporteEstadisticas>(`${this.apiUrl}/mis-reportes/estadisticas`, {
      withCredentials: true
    });
  }

  eliminarReporte(id: number): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/mis-reportes/${id}`, {
      withCredentials: true
    });
  }

  actualizarReporte(id: number, data: {
    descripcion?: string;
    direccion?: string;
    latitud?: number;
    longitud?: number;
    placa?: string;
    fechaIncidente?: string;
    horaIncidente?: string;
    tipoInfraccion?: string;
  }): Observable<ReporteCiudadano> {
    return this.http.put<ReporteCiudadano>(`${this.apiUrl}/mis-reportes/${id}`, data, {
      withCredentials: true
    });
  }
}
