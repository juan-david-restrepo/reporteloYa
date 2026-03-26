import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Nav } from '../../shared/nav/nav';
import { Avatar } from '../../service/avatar';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, AuthUser } from '../../service/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, CommonModule, Nav, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  formLogin: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private avatarService: Avatar
  ) {
    this.formLogin = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      
    });
  }

  onSubmit(): void {
    if (this.formLogin.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor completa todos los campos correctamente.',
      });
      return;
    }

    const { email, password } = this.formLogin.value;

    this.authService.login(email, password).subscribe({
      next: (user: AuthUser | null) => {
        if (!user) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Usuario o contraseña incorrectos',
          });
          return;
        }

        this.avatarService.loadAvatarForUser(user.userId);

        Swal.fire({
          icon: 'success',
          title: 'Bienvenido!',
          text: 'Inicio de sesión exitoso',
          timer: 1500,
          showConfirmButton: false,
        });

        const role = user.role.toUpperCase();
        if (role === 'CIUDADANO') this.router.navigate(['/home']);
        else if (role === 'AGENTE') this.router.navigate(['/agente']);
        else if (role === 'ADMIN') this.router.navigate(['/admin']);
      },
      error: (err) => {
        console.error('Error login:', err);
        const errorMessage = err.error || 'Credenciales incorrectas';
        
        if (errorMessage.includes('verificar') || errorMessage.includes('correo')) {
          Swal.fire({
            icon: 'warning',
            title: 'Correo no verificado',
            html: `<p>${errorMessage}</p><p>¿Deseas reenviar el correo de verificación?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Reenviar correo',
            cancelButtonText: 'Cancelar',
          }).then((result) => {
            if (result.isConfirmed) {
              this.reenviarVerificacion(email);
            }
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error al iniciar sesión',
            text: errorMessage,
          });
        }
      },
    });
  }

  reenviarVerificacion(email: string): void {
    this.authService.resendVerification(email).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Correo enviado',
          html: `<p>Hemos enviado un nuevo correo de verificación a <strong>${email}</strong>.</p><p>Por favor, revisa tu bandeja de entrada y sigue las instrucciones.</p>`,
          showConfirmButton: true,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#2563eb'
        });
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo reenviar el correo de verificación.',
        });
      },
    });
  }
}
