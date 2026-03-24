import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReporteRequest {
  descripcion: string;
  placa: string;
  direccion: string;
  latitud: number;
  longitud: number;
  fechaIncidente: string | null;
  horaIncidente: string | null;
  tipoInfraccion: string;
}

@Injectable({
  providedIn: 'root',
})
export class SubirReporteService {
  private apiUrl = 'http://localhost:8080/api/reportes/crear';

  constructor(private http: HttpClient) {}

  crearReporte(data: ReporteRequest, archivos: File[]): Observable<any> {
    const formData = new FormData();

    formData.append('descripcion', data.descripcion);
    formData.append('direccion', data.direccion);
    formData.append('latitud', data.latitud.toString());
    formData.append('longitud', data.longitud.toString());

    if (data.placa) {
      formData.append('placa', data.placa);
    }

    if (data.fechaIncidente) {
      formData.append('fechaIncidente', data.fechaIncidente);
    }

    if (data.horaIncidente) {
      formData.append('horaIncidente', data.horaIncidente);
    }

    formData.append('tipoInfraccion', data.tipoInfraccion);

    archivos.forEach((file) => {
      formData.append('archivos', file);
    });

    return this.http.post(this.apiUrl, formData, {
      withCredentials: true,
    });
  }
}
