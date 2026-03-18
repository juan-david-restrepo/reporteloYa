import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type EstadoInfraccion =
  | 'PENDIENTE'
  | 'RECHAZADO'
  | 'EN_PROCESO'
  | 'FINALIZADO';

export interface Infraccion {
  id: number;
  fecha: string;
  tipo: string;
  agente: string;
  placa: string;
  estado: EstadoInfraccion;
  ref: string;
  descripcion?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface FiltrosInfraccion {
  estado?: string;
  tipo?: string;
  fechaInicio?: string;
  fechaFin?: string;
  prioridad?: string;
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class InfraccionService {
  private apiUrl = 'http://localhost:8080/api/reportes';

  constructor(private http: HttpClient) {}

  getInfracciones(filtros?: FiltrosInfraccion): Observable<Infraccion[]> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.estado) params = params.set('estado', filtros.estado);
      if (filtros.tipo) params = params.set('tipo', filtros.tipo);
      if (filtros.prioridad) params = params.set('prioridad', filtros.prioridad);
      if (filtros.page !== undefined) params = params.set('page', filtros.page.toString());
      if (filtros.size !== undefined) params = params.set('size', filtros.size.toString());
    }

    return this.http.get<Infraccion[]>(this.apiUrl, { 
      params,
      withCredentials: true 
    }).pipe(
      catchError(error => {
        console.error('Error al obtener infracciones:', error);
        return of([]);
      })
    );
  }

  getAllReportes(): Observable<Infraccion[]> {
    return this.http.get<PageResponse<any>>(`${this.apiUrl}/todos`, { 
      params: new HttpParams()
        .set('page', '0')
        .set('size', '100'),
      withCredentials: true 
    }).pipe(
      map(response => response.content || []),
      catchError(error => {
        console.error('Error al obtener todos los reportes:', error);
        return of([]);
      })
    );
  }

  getInfraccionesPendientes(): Observable<Infraccion[]> {
    return this.http.get<Infraccion[]>(`${this.apiUrl}/pendientes`, {
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error al obtener infracciones pendientes:', error);
        return of([]);
      })
    );
  }

  getInfraccionesEstadisticas(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);

    return this.http.get<any>(`${this.apiUrl}/estadisticas`, { 
      params,
      withCredentials: true 
    }).pipe(
      catchError(error => {
        console.error('Error al obtener estadísticas:', error);
        return of(null);
      })
    );
  }

  getInfraccionesEstadisticasCompletas(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);

    return this.http.get<any>(`${this.apiUrl}/estadisticas-completas`, { 
      params,
      withCredentials: true 
    }).pipe(
      catchError(error => {
        console.error('Error al obtener estadísticas completas:', error);
        return of(null);
      })
    );
  }

  actualizarEstadoInfraccion(id: number, estado: string): Observable<Infraccion> {
    return this.http.put<Infraccion>(`${this.apiUrl}/${id}/estado`, { estado }, {
      withCredentials: true
    });
  }
}
