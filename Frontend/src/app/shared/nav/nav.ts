import { Component, OnInit, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../components/modal/modal.component';
import { AuthService, AuthUser } from '../../service/auth.service';
import { Avatar } from '../../service/avatar';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterModule, CommonModule, ModalComponent],
  templateUrl: './nav.html',
  styleUrls: ['./nav.css'],
})
export class Nav implements OnInit {
  currentYear = new Date().getFullYear();

  isSidebarOpen = false;
  isModalOpen = false;
  currentAvatar = 'assets/images/images (3).png';
  isLoggedIn = false;
  isMobileMenuOpen = false;
  private activeDropdown: HTMLElement | null = null;

  private userId: string | null = null;

  constructor(
    private authService: AuthService,
    private avatarService: Avatar,
    private router: Router,
  ) {}

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 1024 && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  ngOnInit() {
    // 🔹 Suscribirse al usuario actual
    this.authService.currentUser$.subscribe((user: AuthUser | null) => {
      if (user?.userId) {
        this.userId = user.userId;
        this.isLoggedIn = true;

        // Cargar avatar sincronizado automáticamente
        this.avatarService.loadAvatarForUser(this.userId);
      } else {
        this.userId = null;
        this.isLoggedIn = false;
        this.currentAvatar = 'assets/images/images (3).png';
      }
    });

    // 🔹 Suscribirse a cambios globales de avatar
    this.avatarService.avatar$.subscribe((avatar) => {
      this.currentAvatar = avatar || 'assets/images/images (3).png';
    });

    // 🔹 Suscribirse al estado de autenticación (opcional para UI)
    this.authService.authState$.subscribe((state) => {
      this.isLoggedIn = state;
      if (!state) {
        this.currentAvatar = 'assets/images/images (3).png';
        this.userId = null;
      }
    });
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
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
    this.authService.logout().subscribe({
      next: () => {
        this.currentAvatar = 'assets/images/images (3).png';

        // redirigir al login
        this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: (err) => {
        console.error('Error al cerrar sesión', err);
      },
    });
  }
}