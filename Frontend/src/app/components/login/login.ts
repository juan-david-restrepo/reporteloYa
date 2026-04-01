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
      this.marcarCamposInvalidos();
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
        this.manejarErrorLogin(err);
      },
    });
  }

  private manejarErrorLogin(err: any): void {
    let errorMessage = 'Credenciales incorrectas';
    let errorTitle = 'Error al iniciar sesión';
    let icon: 'error' | 'warning' = 'error';

    if (err.error) {
      if (typeof err.error === 'string') {
        errorMessage = err.error;
      } else if (err.error.message) {
        errorMessage = err.error.message;
      }
    }

    if (errorMessage.includes('verificar') || errorMessage.includes('correo')) {
      errorTitle = 'Correo no verificado';
      icon = 'warning';
      Swal.fire({
        icon: icon,
        title: errorTitle,
        html: `<p>${errorMessage}</p><p>¿Deseas reenviar el correo de verificación?</p>`,
        showCancelButton: true,
        confirmButtonText: 'Reenviar correo',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) {
          this.reenviarVerificacion(this.formLogin.get('email')?.value);
        }
      });
      return;
    }

    if (errorMessage.includes('correo') && errorMessage.includes('no existe')) {
      this.formLogin.get('email')?.setErrors({ notFound: true });
    }

    if (errorMessage.includes('contraseña') && (errorMessage.includes('incorrecta') || errorMessage.includes('inválida'))) {
      this.formLogin.get('password')?.setErrors({ incorrect: true });
    }

    Swal.fire({
      icon: icon,
      title: errorTitle,
      text: errorMessage,
    });
  }

  private marcarCamposInvalidos(): void {
    Object.keys(this.formLogin.controls).forEach(key => {
      const control = this.formLogin.get(key);
      if (control?.invalid) {
        control.markAsTouched();
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.formLogin.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) {
      if (fieldName === 'email') return 'El correo electrónico es requerido';
      if (fieldName === 'password') return 'La contraseña es requerida';
    }

    if (control.errors['email']) {
      return 'El formato del correo electrónico no es válido';
    }

    if (control.errors['notFound']) {
      return 'No existe una cuenta con este correo';
    }

    if (control.errors['incorrect']) {
      return 'La contraseña es incorrecta';
    }

    return '';
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
