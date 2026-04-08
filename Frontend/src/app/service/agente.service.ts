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
  estado: 'DISPONIBLE' | 'OCUPADO' | 'FUERA_SERVICIO';
  foto?: string;
  resumenProfesional1?: string;
  resumenProfesional2?: string;
  resumenProfesional3?: string;
  resumenProfesional4?: string;
}

//  NUEVO: DTO que devuelve el backend al buscar compañero
export interface AgenteDisponible {
  placa: string;
  nombre: string;
  estado: string;
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

  actualizarPerfil(datos: {
    placa?: string;
    telefono?: string;
    nombre?: string;
    documento?: string;
    correo?: string;
    resumenProfesional1?: string;
    resumenProfesional2?: string;
    resumenProfesional3?: string;
    resumenProfesional4?: string;
  }): Observable<any> {
    return this.http.put(`${this.apiAgente}/perfil`, datos, {
      withCredentials: true
    });
  }

  actualizarFotoPerfil(foto: string): Observable<any> {
    return this.http.put(`${this.apiAgente}/perfil/foto`, { foto }, {
      withCredentials: true
    });
  }

  // =============================
  // REPORTES ACTIVOS DEL AGENTE
  // =============================
  getReportesAgente(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiReportes}/agente`, {
      withCredentials: true
    });
  }

  // =============================
  // ACEPTAR REPORTE (ir SOLO)
  // =============================
  tomarReporte(id: number): Observable<any> {
    return this.http.post(
      `${this.apiReportes}/aceptar/${id}`,
      {},
      { withCredentials: true }
    );
  }

  // ✅ NUEVO: ACEPTAR REPORTE (ir ACOMPAÑADO)
  tomarReporteAcompanado(id: number, placaCompanero: string): Observable<any> {
    return this.http.post(
      `${this.apiReportes}/aceptar/${id}/acompanado`,
      { placaCompanero },
      { withCredentials: true }
    );
  }

  // ✅ NUEVO: BUSCAR AGENTE DISPONIBLE POR PLACA
  buscarAgenteDisponible(placa: string): Observable<AgenteDisponible> {
    return this.http.get<AgenteDisponible>(
      `${this.apiReportes}/buscar-agente/${placa}`,
      { withCredentials: true }
    );
  }

  // =============================
  // FINALIZAR REPORTE
  // =============================
  finalizarReporte(id: number, resumen: string): Observable<any> {
    return this.http.post(
      `${this.apiReportes}/finalizar/${id}`,
      { resumen },
      { withCredentials: true }
    );
  }

  // =============================
  // RECHAZAR REPORTE
  // =============================
  rechazarReporte(id: number): Observable<any> {
    return this.http.post(
      `${this.apiReportes}/rechazar/${id}`,
      {},
      { withCredentials: true }
    );
  }

  // ✅ NUEVO: HISTORIAL DEL AGENTE (desde BD)
  getHistorialAgente(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiReportes}/agente/historial`, {
      withCredentials: true
    });
  }

  // =============================
  // TAREAS DEL AGENTE
  // =============================
  getTareasAgente(): Observable<any> {
    return this.http.get('http://localhost:8080/agente/tareas', { withCredentials: true });
  }

  // =============================
  // ACTUALIZAR ESTADO DEL AGENTE
  // =============================
  actualizarEstado(estado: string): Observable<any> {
    return this.http.post(
      'http://localhost:8080/agente/estado',
      { estado },
      { withCredentials: true }
    );
  }

  // =============================
  // ACTUALIZAR ESTADO DE TAREA
  // =============================
  actualizarEstadoTarea(id: number, estado: string, resumenOperativo?: string): Observable<any> {
    return this.http.post(
      `${this.apiAgente}/tareas/${id}/estado`,
      { estado, resumenOperativo },
      { withCredentials: true }
    );
  }

  // =============================
  // REPORTES PAGINADOS (SCROLL GENERAL)
  // =============================
  getReportes(page: number, size: number, prioridad?: string): Observable<any> {
    let url = `${this.apiReportes}?page=${page}&size=${size}`;
    if (prioridad && prioridad !== 'TODOS') {
      url += `&prioridad=${prioridad}`;
    }
    return this.http.get<any>(url, { withCredentials: true });
  }

  // =============================
  // ESTADÍSTICAS PARA DASHBOARD
  // =============================
  getEstadisticasDashboard(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let url = `${this.apiReportes}/estadisticas`;
    if (fechaInicio && fechaFin) {
      url += `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    }
    return this.http.get<any>(url, { withCredentials: true });
  }

  // =============================
  // ESTADÍSTICAS COMPLETAS (TARJETAS + GRÁFICAS)
  // =============================
  getEstadisticasCompletas(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let url = `${this.apiReportes}/estadisticas-completas`;
    const params: string[] = [];
    if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
    if (fechaFin) params.push(`fechaFin=${fechaFin}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.http.get<any>(url, { withCredentials: true });
  }

  // =============================
  // NOTIFICACIONES NO LEÍDAS
  // =============================
  getNotificacionesNoLeidas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiAgente}/notificaciones`, {
      withCredentials: true
    });
  }

  marcarNotificacionLeida(id: number): Observable<any> {
    return this.http.put(`${this.apiAgente}/notificaciones/${id}/leida`, {}, {
      withCredentials: true
    });
  }

  generarPdfOperativo(reporte: any): Observable<Blob> {
    return this.http.post('http://localhost:3000/api/operativo-pdf', reporte, {
      responseType: 'blob'
    });
  }
}
