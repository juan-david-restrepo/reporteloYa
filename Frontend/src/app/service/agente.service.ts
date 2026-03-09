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
  estado: 'LIBRE' | 'OCUPADO' | 'FUERA_SERVICIO';
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

  getTareasAgente(): Observable<any>{
    return this.http.get('http://localhost:8080/agente/tareas', {withCredentials:true});
  }

  actualizarEstado(estado:string){
    return this.http.post(
      'http://localhost:8080/agente/estado',
      {estado},
      {withCredentials:true}
    );
  }

  actualizarEstadoTarea(id:number, estado:string){
    return this.http.post(
      `${this.apiAgente}/tareas/${id}/estado`,
      {estado},
      {withCredentials:true}
    );
  }

}