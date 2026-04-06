import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';
import { AuthService, AuthUser } from '../../service/auth.service';
import { WebsocketService } from '../../service/websocket.service';
import { Subscription } from 'rxjs';

interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
  idReferencia?: number;
  datosAdicionales?: string;
}

@Component({
  selector: 'app-mensajes',
  standalone: true,
  imports: [CommonModule, RouterModule, Nav, Footer],
  templateUrl: './mensajes.html',
  styleUrls: ['./mensajes.css']
})
export class Mensajes implements OnInit, OnDestroy {
  notificaciones: Notificacion[] = [];
  isLoading = true;
  isLoggedIn = false;
  userId: string | null = null;
  email: string | null = null;
  
  private wsSubscription?: Subscription;
  private httpSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private websocketService: WebsocketService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe((user: AuthUser | null) => {
      if (user?.userId) {
        this.userId = user.userId;
        this.email = user.email;
        this.isLoggedIn = true;
        this.cargarNotificaciones();
        this.conectarWebSocket();
      } else {
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.wsSubscription?.unsubscribe();
    this.httpSubscription?.unsubscribe();
  }

  private conectarWebSocket() {
    if (!this.email) return;
    
    this.wsSubscription?.unsubscribe();
    this.wsSubscription = this.websocketService.notificacionesCiudadano$.subscribe((notif: Notificacion) => {
      this.notificaciones.unshift(notif);
    });

    this.websocketService.connectCiudadano(this.email);
  }

  cargarNotificaciones() {
    if (!this.userId) return;

    this.isLoading = true;
    this.httpSubscription?.unsubscribe();
    this.http.get<Notificacion[]>('http://localhost:8080/api/ciudadano/notificaciones').subscribe({
      next: (notifs) => {
        this.notificaciones = notifs;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando notificaciones:', err);
        this.isLoading = false;
      }
    });
  }

  get notificacionesNoLeidas(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  getIcono(tipo: string): string {
    switch (tipo) {
      case 'REPORTE_ACEPTADO': return 'fa-check';
      case 'REPORTE_RECHAZADO': return 'fa-xmark';
      case 'REPORTE_FINALIZADO': return 'fa-check-double';
      default: return 'fa-bell';
    }
  }

  getClaseIcono(tipo: string): string {
    switch (tipo) {
      case 'REPORTE_ACEPTADO': return 'icono-aceptado';
      case 'REPORTE_RECHAZADO': return 'icono-rechazado';
      case 'REPORTE_FINALIZADO': return 'icono-finalizado';
      default: return 'icono-default';
    }
  }

  getTitulo(tipo: string): string {
    switch (tipo) {
      case 'REPORTE_ACEPTADO': return 'Reporte aceptado';
      case 'REPORTE_RECHAZADO': return 'Reporte no aceptado';
      case 'REPORTE_FINALIZADO': return 'Reporte finalizado';
      default: return 'Notificación';
    }
  }

  marcarLeida(notif: Notificacion) {
    if (!notif.leida) {
      notif.leida = true;
      this.http.put(`http://localhost:8080/api/ciudadano/notificaciones/${notif.id}/leida`, {}).subscribe({
        error: (err) => console.error('Error marcando notificación:', err)
      });
    }
  }

  marcarTodasLeidas() {
    this.notificaciones.forEach(n => n.leida = true);
    this.http.put('http://localhost:8080/api/ciudadano/notificaciones/leer-todas', {}).subscribe({
      error: (err) => console.error('Error:', err)
    });
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMins / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} hr`;
    if (diffDias < 7) return `Hace ${diffDias} días`;
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  }
}
