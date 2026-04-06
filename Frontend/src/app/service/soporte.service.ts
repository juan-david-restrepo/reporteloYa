import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TicketSoporte,
  TicketDetalle,
  MensajeSoporte,
  CrearTicketRequest,
  ResponderTicketRequest,
  ContadorTickets
} from '../models/soporte.model';

@Injectable({
  providedIn: 'root'
})
export class SoporteService {
  private apiUrl = 'http://localhost:8080/api/soporte';

  constructor(private http: HttpClient) {}

  crearTicket(data: CrearTicketRequest): Observable<TicketSoporte> {
    return this.http.post<TicketSoporte>(`${this.apiUrl}/crear`, data, { withCredentials: true });
  }

  misTickets(): Observable<TicketSoporte[]> {
    return this.http.get<TicketSoporte[]>(`${this.apiUrl}/mis-tickets`, { withCredentials: true });
  }

  verMiTicket(id: number): Observable<TicketDetalle> {
    return this.http.get<TicketDetalle>(`${this.apiUrl}/mis-tickets/${id}`, { withCredentials: true });
  }

  responderMiTicket(id: number, contenido: string): Observable<MensajeSoporte> {
    const request: ResponderTicketRequest = { contenido };
    return this.http.post<MensajeSoporte>(
      `${this.apiUrl}/mis-tickets/${id}/responder`,
      request,
      { withCredentials: true }
    );
  }

  todosLosTickets(): Observable<TicketSoporte[]> {
    return this.http.get<TicketSoporte[]>(`${this.apiUrl}/admin/tickets`, { withCredentials: true });
  }

  verTicketAdmin(id: number): Observable<TicketDetalle> {
    return this.http.get<TicketDetalle>(`${this.apiUrl}/admin/tickets/${id}`, { withCredentials: true });
  }

  responderComoAdmin(id: number, contenido: string): Observable<MensajeSoporte> {
    const request: ResponderTicketRequest = { contenido };
    return this.http.post<MensajeSoporte>(
      `${this.apiUrl}/admin/tickets/${id}/responder`,
      request,
      { withCredentials: true }
    );
  }

  cerrarTicket(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/tickets/${id}/cerrar`, {}, { withCredentials: true });
  }

  contadorTickets(): Observable<ContadorTickets> {
    return this.http.get<ContadorTickets>(`${this.apiUrl}/admin/tickets/contador`, { withCredentials: true });
  }
}
