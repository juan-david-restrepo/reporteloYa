import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
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

  private userId: string | null = null;

  constructor(
    private authService: AuthService,
    private avatarService: Avatar
  ) {}

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
    this.avatarService.avatar$.subscribe(avatar => {
      this.currentAvatar = avatar || 'assets/images/images (3).png';
    });

    // 🔹 Suscribirse al estado de autenticación (opcional para UI)
    this.authService.authState$.subscribe(state => {
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
      },
      error: (err) => {
        console.error('Error al cerrar sesión', err);
      }
    });
  }
}