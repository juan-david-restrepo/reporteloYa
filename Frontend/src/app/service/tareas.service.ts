import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TareasService {

  private apiUrl = 'http://localhost:8080/admin';

  constructor(private http: HttpClient) {}

  obtenerTareasPorAgente(placa: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${placa}`, { withCredentials: true });
  }

  asignarTarea(placa: string, tarea: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${placa}/tareas`, tarea, { withCredentials: true });
  }

  eliminarTarea(idTarea: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tareas/${idTarea}`, { withCredentials: true });
  }
}