import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SoporteService } from '../../../service/soporte.service';
import { SoporteWebSocketService } from '../../../service/soporte-websocket.service';
import { TicketSoporte, TicketDetalle } from '../../../models/soporte.model';
import { SidebarAdmin } from '../sidebar-admin/sidebar-admin';

@Component({
  selector: 'app-gestion-soporte',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarAdmin],
  templateUrl: './gestion-soporte.html',
  styleUrls: ['./gestion-soporte.css']
})
export class GestionSoporte implements OnInit, OnDestroy {
  menuAbierto = false;
  tickets: TicketSoporte[] = [];
  ticketsFiltrados: TicketSoporte[] = [];
  ticketSeleccionado: TicketDetalle | null = null;
  
  filtroEstado = 'TODOS';
  respuestaTexto = '';
  cargando = false;
  enviandoRespuesta = false;
  
  ticketsAbiertos = 0;
  ticketsEnProceso = 0;
  ticketsCerrados = 0;

  private subscriptions: Subscription[] = [];

  constructor(
    private soporteService: SoporteService,
    private wsService: SoporteWebSocketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarTickets();
    this.conectarWebSocket();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.wsService.disconnect();
  }

  conectarWebSocket(): void {
    this.wsService.connectAdmin();
    
    const subNuevo = this.wsService.nuevosTickets$.subscribe(ticket => {
      const index = this.tickets.findIndex(t => t.id === ticket.id);
      if (index >= 0) {
        this.tickets[index] = ticket;
      } else {
        this.tickets.unshift(ticket);
      }
      this.actualizarContadores();
      this.filtrarPorEstado(this.filtroEstado);
      this.cdr.detectChanges();
    });
    this.subscriptions.push(subNuevo);

    const subUpdate = this.wsService.ticketUpdates$.subscribe(ticket => {
      const index = this.tickets.findIndex(t => t.id === ticket.id);
      if (index >= 0) {
        this.tickets[index] = ticket;
      }
      this.actualizarContadores();
      this.filtrarPorEstado(this.filtroEstado);
      this.cdr.detectChanges();
    });
    this.subscriptions.push(subUpdate);
  }

  cargarTickets(): void {
    this.cargando = true;
    this.soporteService.todosLosTickets().subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.actualizarContadores();
        this.filtrarPorEstado(this.filtroEstado);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  actualizarContadores(): void {
    this.ticketsAbiertos = this.tickets.filter(t => t.estado === 'ABIERTO').length;
    this.ticketsEnProceso = this.tickets.filter(t => t.estado === 'EN_PROCESO').length;
    this.ticketsCerrados = this.tickets.filter(t => t.estado === 'CERRADO').length;
  }

  filtrarPorEstado(estado: string): void {
    this.filtroEstado = estado;
    if (estado === 'TODOS') {
      this.ticketsFiltrados = [...this.tickets];
    } else {
      this.ticketsFiltrados = this.tickets.filter(t => t.estado === estado);
    }
  }

  seleccionarTicket(ticket: TicketSoporte): void {
    this.wsService.subscribeToTicket(ticket.id);
    
    this.soporteService.verTicketAdmin(ticket.id).subscribe({
      next: (detalle) => {
        this.ticketSeleccionado = detalle;
        this.cdr.detectChanges();
      }
    });
  }

  cerrarDetalle(): void {
    this.ticketSeleccionado = null;
    this.respuestaTexto = '';
  }

  enviarRespuesta(): void {
    if (!this.respuestaTexto.trim() || !this.ticketSeleccionado) return;

    this.enviandoRespuesta = true;
    this.soporteService.responderComoAdmin(
      this.ticketSeleccionado.id,
      this.respuestaTexto.trim()
    ).subscribe({
      next: () => {
        this.seleccionarTicket({ ...this.ticketSeleccionado!, id: this.ticketSeleccionado!.id } as TicketSoporte);
        this.respuestaTexto = '';
        this.enviandoRespuesta = false;
        this.cargarTickets();
        this.cdr.detectChanges();
      },
      error: () => {
        this.enviandoRespuesta = false;
        this.cdr.detectChanges();
      }
    });
  }

  cerrarTicket(): void {
    if (!this.ticketSeleccionado) return;

    this.soporteService.cerrarTicket(this.ticketSeleccionado.id).subscribe({
      next: () => {
        this.cerrarDetalle();
        this.cargarTickets();
      }
    });
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getClasePrioridad(prioridad: string): string {
    return `prioridad-${prioridad.toLowerCase()}`;
  }

  getClaseEstado(estado: string): string {
    return `estado-${estado.toLowerCase()}`;
  }
}
