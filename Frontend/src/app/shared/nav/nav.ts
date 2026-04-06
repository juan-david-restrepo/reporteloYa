
import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
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
  isMobileMenuOpen = false;
  private activeDropdown: HTMLElement | null = null;

  private userId: string | null = null;
  private email: string | null = null;
  private wsSubscription?: Subscription;
  private httpSubscription?: Subscription;

  notificaciones: NotificacionCiudadano[] = [];
  mostrarNotifDropdown = false;
  mostrarNotifDropdownMobile = false;

  constructor(
    private authService: AuthService,
    private avatarService: Avatar,
    private router: Router,
    private websocketService: WebsocketService,
    private http: HttpClient,
    private configCiudadanoService: ConfigCiudadanoService,
  ) {}

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 1024 && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe((user: AuthUser | null) => {
      if (user?.userId) {
        this.userId = user.userId;
        this.email = user.email;
        this.isLoggedIn = true;
        this.avatarService.loadAvatarForUser(this.userId);
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
    
    this.wsSubscription?.unsubscribe();
    this.wsSubscription = this.websocketService.notificacionesCiudadano$.subscribe((notif: NotificacionCiudadano) => {
      this.notificaciones.unshift(notif);
    });

    this.websocketService.connectCiudadano(this.email);
  }

  private cargarNotificaciones() {
    if (!this.userId) return;

    this.httpSubscription?.unsubscribe();
    this.http.get<NotificacionCiudadano[]>('http://localhost:8080/api/ciudadano/notificaciones').subscribe({
      next: (notifs) => {
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

  toggleNotificacionesMobile(event: Event) {
    event.stopPropagation();
    this.mostrarNotifDropdownMobile = !this.mostrarNotifDropdownMobile;
    if (!this.mostrarNotifDropdownMobile) {
      this.marcarTodasLeidas();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.mostrarNotifDropdownMobile) return;
    
    const target = event.target as HTMLElement;
    const notifWrapper = document.querySelector('.mobile-notif-wrapper');
    const notifDropdown = document.querySelector('.mobile-notif-dropdown');
    
    if (notifWrapper && notifDropdown) {
      if (!notifWrapper.contains(target) && !notifDropdown.contains(target)) {
        this.mostrarNotifDropdownMobile = false;
      }
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
    if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
    this.isSidebarOpen = !this.isSidebarOpen;
    if (this.isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
    document.body.style.overflow = '';
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  openSidebarFromMobile(): void {
    this.closeMobileMenu();
    this.toggleSidebar();
  }

  toggleDropdown(event: Event): void {
    const target = event.currentTarget as HTMLElement;
    const container = target.parentElement;
    if (!container) return;

    const dropdown = container.querySelector('.dropdown') as HTMLElement;
    if (!dropdown) return;

    if (window.innerWidth <= 1024) {
      event.preventDefault();
      if (this.activeDropdown && this.activeDropdown !== dropdown) {
        this.activeDropdown.classList.remove('mobile-open');
      }
      
      if (dropdown.classList.contains('mobile-open')) {
        dropdown.classList.remove('mobile-open');
        this.activeDropdown = null;
      } else {
        dropdown.classList.add('mobile-open');
        this.activeDropdown = dropdown;
      }
    }
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