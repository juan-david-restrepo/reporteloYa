import { Component, OnInit } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';
import { Avatar } from '../../service/avatar';
import { UserService, Usuario } from '../../service/user.service';
import { ModalComponent } from '../modal/modal.component';
import Swal from 'sweetalert2';
import { AuthService, AuthUser } from '../../service/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, Nav, Footer, ModalComponent],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css'],
})
export class Perfil implements OnInit {
  totalReportes: number = 0;
  avatar = '';
  selectedBackground = '#1e3a8a';
  isEditing = false;

  isModalOpen = false;
  private userId: string | null = null; // ID del usuario logueado
  isLoggedIn = false;

  user = {
    name: '',
    lastname: '',
    email: '',
    password: '',
    password2: ''
  };

  constructor(
    private avatarService: Avatar,
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // 🔹 Refrescar usuario desde cookie y sincronizar estado
    this.authService.refreshUser().subscribe({
      next: (currentUser: AuthUser | null) => {
        if (!currentUser || !currentUser.userId) {
          this.isLoggedIn = false;
          console.warn('Usuario no logueado: perfil no cargado.');
          return;
        }

        this.userId = currentUser.userId;
        this.isLoggedIn = true;

        // 🔹 Cargar avatar sincronizado
        this.avatarService.loadAvatarForUser(this.userId);
        this.avatarService.avatar$.subscribe(avatar => {
          if (avatar) this.avatar = avatar;
        });

        // 🔹 Cargar datos de perfil desde backend con cookies
        this.loadProfile();

        // 🔹 Cargar total de reportes
        this.userService.getTotalReportes().subscribe({
          next: (res) => this.totalReportes = res.total_reportes,
          error: (err) => console.error('Error al obtener reportes:', err)
        });
      },
      error: (err) => {
        console.error('Error al refrescar usuario:', err);
        this.isLoggedIn = false;
      }
    });
  }

  private loadProfile() {
    this.userService.getProfile().subscribe({
      next: (user: Usuario) => {
        const parts = user.nombreCompleto.split(' ');
        this.user.name = parts[0];
        this.user.lastname = parts.length > 1 ? parts.slice(1).join(' ') : '';
        this.user.email = user.email || '';
      },
      error: err => {
        console.error('Error al cargar perfil:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el perfil. Revisa que tu sesión esté activa.'
        });
      }
    });
  }

  openAvatarModal() {
    this.isModalOpen = true;
  }

  onAvatarSelected(newAvatar: string) {
    if (this.userId) {
      this.avatarService.setAvatarForUser(this.userId, newAvatar);
    }
    this.isModalOpen = false;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && this.userId) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarService.setAvatarForUser(this.userId!, e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
  }

  saveProfile() {
    if (this.user.password && this.user.password !== this.user.password2) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Las contraseñas no coinciden'
      });
      return;
    }

    const updatedUser: Usuario = {
      nombreCompleto: `${this.user.name} ${this.user.lastname}`,
      email: this.user.email,
      password: this.user.password || null
    };

    this.userService.updateProfile(updatedUser).subscribe({
      next: res => {
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Cambios guardados correctamente'
        });
        this.user.password = '';
        this.user.password2 = '';
      },
      error: err => {
        console.error('Error al guardar perfil:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al guardar los cambios'
        });
      }
    });
  }
}