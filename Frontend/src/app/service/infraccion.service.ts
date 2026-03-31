import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type EstadoInfraccion =
  | 'PENDIENTE'
  | 'RECHAZADO'
  | 'EN_PROCESO'
  | 'FINALIZADO';

export interface Infraccion {
  id: number;
  ref?: string;
  fecha?: string;
  tipo?: string;
  tipoInfraccion?: string;
  agente?: string;
  nombreAgente?: string;
  placaAgente?: string;
  placa?: string;
  estado: string;
  descripcion?: string;
  resumen?: string;
  resumenOperativo?: string;
  ubicacion?: string;
  direccion?: string;
  prioridad?: string;
  fechaIncidente?: string;
  horaIncidente?: string;
  urlFoto?: string;
  fechaAceptado?: string;
  fechaFinalizado?: string;
  fechaRechazado?: string;
  createdAt?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface AdminDashboard {
  totalReportes: number;
  pendientes: number;
  enProceso: number;
  finalizados: number;
  rechazados: number;
  reportesHoy: number;
  estadisticasTipo?: StatItem[];
  estadisticasMes?: StatItem[];
  estadisticasSemana?: StatItem[];
}

export interface StatItem {
  etiqueta: string;
  cantidad: number;
}

@Injectable({
  providedIn: 'root'
})
export class InfraccionService {

  private apiUrl = 'http://localhost:8080/api/reportes';

  constructor(private http: HttpClient) {}

  getInfracciones(page: number = 0, size: number = 100): Observable<PageResponse<Infraccion>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<PageResponse<Infraccion>>(`${this.apiUrl}/todos`, { params });
  }

  getInfraccionesSimple(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/todos?page=0&size=100`);
  }

  getPendientes(): Observable<Infraccion[]> {
    return this.http.get<Infraccion[]>(`${this.apiUrl}/pendientes`);
  }

  getEstadisticasAdmin(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.apiUrl}/estadisticas-admin`);
  }
}
