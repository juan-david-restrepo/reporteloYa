import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Nav } from '../../shared/nav/nav';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import Swal from 'sweetalert2';
import { AuthService, AuthUser } from '../../service/auth.service';
import { Avatar } from '../../service/avatar';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [RouterLink, CommonModule, Nav, ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrls: ['./registro.css'],
})
export class Registro {
  registroForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private avatarService: Avatar
  ) {
    this.registroForm = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.maxLength(60),
          Validators.pattern(/^[a-zA-ZÀ-ÿ\s]+$/),
        ],
      ],
      correo: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(80),
        ],
      ],
      contrasena: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
        ],
      ],
      tipoDocumento: ['', Validators.required],
      numeroDocumento: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d+$/),
          Validators.minLength(6),
          Validators.maxLength(10),
        ],
      ],
      rol: ['CIUDADANO', Validators.required],
    });
  }

  /** Redirección según rol */
  private redirigirSegunRol(rol: string) {
    switch (rol?.toUpperCase()) {
      case 'ADMIN':
        this.router.navigate(['/admin']);
        break;
      case 'AGENTE':
        this.router.navigate(['/agente']);
        break;
      case 'CIUDADANO':
        this.router.navigate(['/home']);
        break;
      default:
        this.router.navigate(['/home']);
    }
  }

  /** Enviar formulario */
  onSubmit(): void {
    if (this.registroForm.invalid) {
      Swal.fire('Formulario inválido', 'Revisa los campos del formulario.', 'warning');
      return;
    }

    const data = {
      nombreCompleto: this.registroForm.value.nombre,
      email: this.registroForm.value.correo,
      password: this.registroForm.value.contrasena,
      tipoDocumento: this.registroForm.value.tipoDocumento,
      numeroDocumento: this.registroForm.value.numeroDocumento,
      rol: this.registroForm.value.rol,
    };

    // Registramos al usuario
    this.authService.register(data).subscribe({
      next: () => {
        // 🔹 Nos suscribimos al Observable currentUser$ para obtener el usuario actualizado
        const sub = this.authService.currentUser$.subscribe({
          next: (user: AuthUser | null) => {
            if (!user) return;

            Swal.fire({
              icon: 'success',
              title: '¡Registro exitoso!',
              timer: 1500,
              showConfirmButton: false,
            }).then(() => {
              this.redirigirSegunRol(user.role);
            });

            // Cancelamos la suscripción para no escuchar más cambios
            sub.unsubscribe();
          },
          error: (err) => {
            console.error('Error al obtener usuario:', err);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo obtener la información del usuario después del registro.',
            });
          },
        });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error al registrar',
          text: err.error || 'Hubo un problema durante el registro.',
        });
      },
    });
  }
}