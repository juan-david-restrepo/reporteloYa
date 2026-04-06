import { Component, OnInit } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';
import { Avatar } from '../../service/avatar';
import { UserService, Usuario } from '../../service/user.service';
import { ModalComponent } from '../modal/modal.component';
import Swal from 'sweetalert2';
import { AuthService, AuthUser } from '../../service/auth.service';
import { ActividadRecienteService, ActividadReciente } from '../../service/actividad-reciente.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Nav, Footer, ModalComponent],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css'],
})
export class Perfil implements OnInit {
  totalReportes: number = 0;
  notificacionesNoLeidas: number = 0;
  avatar = '';
  selectedBackground = '#1e3a8a';
  isEditing = false;

  isModalOpen = false;
  private userId: string | null = null;
  isLoggedIn = false;
  esCiudadano: boolean = true;
  
  actividades: ActividadReciente[] = [];

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
    private authService: AuthService,
    private actividadService: ActividadRecienteService
  ) {}

  ngOnInit() {
    this.esCiudadano = this.actividadService.esCiudadano();
    
    if (this.esCiudadano) {
      this.actividadService.registrarAccesoModulo('Perfil');
    }

    this.authService.refreshUser().subscribe({
      next: (currentUser: AuthUser | null) => {
        if (!currentUser || !currentUser.userId) {
          this.isLoggedIn = false;
          return;
        }

        this.userId = currentUser.userId;
        this.isLoggedIn = true;

        this.avatarService.loadAvatarForUser(this.userId);
        this.avatarService.avatar$.subscribe(avatar => {
          if (avatar) this.avatar = avatar;
        });

        this.loadProfile();

        this.userService.getTotalReportes().subscribe({
          next: (res) => this.totalReportes = res.total_reportes,
          error: (err) => console.error('Error al obtener reportes:', err)
        });

        this.userService.getNotificacionesNoLeidas().subscribe({
          next: (count) => this.notificacionesNoLeidas = count,
          error: (err) => console.error('Error al obtener notificaciones:', err)
        });

        if (this.esCiudadano) {
          this.cargarActividades();
        }
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

  cargarActividades() {
    this.actividadService.actividades$.subscribe(actividades => {
      this.actividades = actividades;
    });
  }

  openAvatarModal() {
    this.isModalOpen = true;
  }

  onAvatarSelected(newAvatar: string) {
    if (this.userId) {
      this.avatarService.setAvatarForUser(this.userId, newAvatar);
      if (this.esCiudadano) {
        this.actividadService.registrarCambioAvatar();
      }
    }
    this.isModalOpen = false;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && this.userId) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarService.setAvatarForUser(this.userId!, e.target.result);
        if (this.esCiudadano) {
          this.actividadService.registrarCambioAvatar();
        }
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
        if (this.esCiudadano) {
          this.actividadService.registrarActualizacionPerfil();
        }
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

  limpiarActividades() {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Se eliminarán todas las actividades recientes',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.actividadService.limpiarActividades();
        Swal.fire({
          icon: 'success',
          title: '¡Limpiado!',
          text: 'Las actividades han sido eliminadas'
        });
      }
    });
  }
}
