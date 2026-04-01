import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../components/modal/modal.component';
import { AuthService, AuthUser } from '../../service/auth.service';
import { Avatar } from '../../service/avatar';
import { WebsocketService } from '../../service/websocket.service';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ConfigCiudadanoService } from '../../service/config-ciudadano.service';

interface NotificacionCiudadano {
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
  selector: 'app-nav',
  standalone: true,
  imports: [RouterModule, CommonModule, ModalComponent],
  templateUrl: './nav.html',
  styleUrls: ['./nav.css'],
})
export class Nav implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();

  isSidebarOpen = false;
  isModalOpen = false;
  currentAvatar = 'assets/images/images (3).png';
  isLoggedIn = false;

  private userId: string | null = null;
  private email: string | null = null;
  private wsSubscription?: Subscription;
  private httpSubscription?: Subscription;

  notificaciones: NotificacionCiudadano[] = [];
  mostrarNotifDropdown = false;

  constructor(
    private authService: AuthService,
    private avatarService: Avatar,
    private router: Router,
    private websocketService: WebsocketService,
    private http: HttpClient,
    private configCiudadanoService: ConfigCiudadanoService,
  ) {}

  ngOnInit() {
    console.log('🔔 Nav ngOnInit - iniciando...');
    
    this.authService.currentUser$.subscribe((user: AuthUser | null) => {
      console.log('🔔 Nav: cambio en currentUser$', user);
      
      if (user?.userId) {
        this.userId = user.userId;
        this.email = user.email;
        this.isLoggedIn = true;
        this.avatarService.loadAvatarForUser(this.userId);
        console.log('🔔 Nav: Usuario logueado, email:', this.email);
        this.cargarNotificaciones();
        this.conectarWebSocket();
        
        if (user.role === 'CIUDADANO') {
          this.configCiudadanoService.aplicarEstilos();
        }
      } else {
        this.userId = null;
        this.email = null;
        this.isLoggedIn = false;
        this.currentAvatar = 'assets/images/images (3).png';
        this.notificaciones = [];
        console.log('🔔 Nav: Usuario NO logueado');
      }
    });

    this.avatarService.avatar$.subscribe((avatar) => {
      this.currentAvatar = avatar || 'assets/images/images (3).png';
    });

    this.authService.authState$.subscribe((state) => {
      this.isLoggedIn = state;
      if (!state) {
        this.currentAvatar = 'assets/images/images (3).png';
        this.userId = null;
        this.email = null;
      }
    });
  }

  ngOnDestroy() {
    this.wsSubscription?.unsubscribe();
    this.httpSubscription?.unsubscribe();
  }

  private conectarWebSocket() {
    if (!this.email) return;
    
    console.log('🔔 Nav: Conectando WebSocket para ciudadano email:', this.email);
    
    this.wsSubscription?.unsubscribe();
    this.wsSubscription = this.websocketService.notificacionesCiudadano$.subscribe((notif: NotificacionCiudadano) => {
      console.log('📥 Notificación WebSocket recibida en Nav:', notif);
      this.notificaciones.unshift(notif);
    });

    this.websocketService.connectCiudadano(this.email);
  }

  private cargarNotificaciones() {
    if (!this.userId) return;

    console.log('🔔 Nav: Cargando notificaciones desde API para userId:', this.userId);
    
    this.httpSubscription?.unsubscribe();
    this.http.get<NotificacionCiudadano[]>('http://localhost:8080/api/ciudadano/notificaciones').subscribe({
      next: (notifs) => {
        console.log('🔔 Nav: Notificaciones cargadas:', notifs.length, notifs);
        this.notificaciones = notifs;
      },
      error: (err) => console.error('Error cargando notificaciones:', err)
    });
  }

  get notificacionesNoLeidas(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  toggleNotificaciones() {
    this.mostrarNotifDropdown = !this.mostrarNotifDropdown;
    if (!this.mostrarNotifDropdown) {
      this.marcarTodasLeidas();
    }
  }

  marcarTodasLeidas() {
    this.notificaciones.forEach(n => n.leida = true);
    this.http.put('http://localhost:8080/api/ciudadano/notificaciones/leer-todas', {}).subscribe({
      error: (err) => console.error('Error marcando notificaciones:', err)
    });
  }

  abrirNotificacion(notif: NotificacionCiudadano) {
    if (!notif.leida) {
      notif.leida = true;
      this.http.put(`http://localhost:8080/api/ciudadano/notificaciones/${notif.id}/leida`, {}).subscribe();
    }
    
    if (notif.idReferencia) {
      this.router.navigate(['/mis-reportes']);
    }
    this.mostrarNotifDropdown = false;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  openModal() {
    this.isModalOpen = true;
  }

  onAvatarSelected(avatar: string) {
    if (this.userId) {
      this.avatarService.setAvatarForUser(this.userId, avatar);
    }
    this.isModalOpen = false;
  }

  logout() {
    this.websocketService.disconnect();
    this.authService.logout().subscribe({
      next: () => {
        this.currentAvatar = 'assets/images/images (3).png';
        this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: (err) => {
        console.error('Error al cerrar sesión', err);
      },
    });
  }
}