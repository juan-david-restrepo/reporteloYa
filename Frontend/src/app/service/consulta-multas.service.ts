import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DatosConsulta {
  tipo: 'documento';
  tipoDoc: string;
  valor: string;
}

export interface ResultadoMultas {
  sessionId?: string;
  multas?: Multa[];
  totales?: Totales;
  tieneDeudas?: boolean;
  infoExtra?: InfoExtra;
  mensaje?: string;
  error?: string;
  success?: boolean;
  alternativas?: string[];
}

export interface Multa {
  numero?: number;
  comparendo?: string;
  infraccion?: string;
  resolucion?: string;
  secretaria?: string;
  estado?: string;
  valorMulta?: number;
  interesMora?: number;
  valorAdicional?: number;
  fechaComparendo?: string;
  fechaResolucion?: string;
  nombreInfractor?: string;
  valorTotal?: number;
  placa?: string;
  ciudad?: string;
  departamento?: string;
}

export interface Totales {
  totalMultas?: number;
  valorTotal?: number;
  valorMultas?: number;
  interesesTotales?: number;
  valoresAdicionales?: number;
}

export interface InfoExtra {
  nombre?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  tienePazSalvo?: boolean;
  acuerdosPago?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConsultaMultasService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  consultarMultas(datos: DatosConsulta): Observable<ResultadoMultas> {
    return this.http.post<ResultadoMultas>(`${this.apiUrl}/consultar`, datos);
  }

  generarPDF(sessionId: string, datosConsulta: DatosConsulta): Observable<Blob> {
    const payload = sessionId ? { sessionId } : datosConsulta;
    return this.http.post(`${this.apiUrl}/generar-pdf`, payload, {
      responseType: 'blob'
    });
  }

  setApiUrl(url: string): void {
    this.apiUrl = url;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  getEstado(): Observable<any> {
    return this.http.get(`${this.apiUrl}/estado`);
  }
}
