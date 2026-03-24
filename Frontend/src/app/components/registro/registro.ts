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
  requisitosContrasena = {
    longitud: false,
    mayuscula: false,
    minuscula: false,
    numero: false,
    especial: false,
  };
  contrasenaSegura = false;
  tipoDocumentoSeleccionado = '';

  get placeholderDocumento(): string {
    return this.tipoDocumentoSeleccionado === 'PASAPORTE' 
      ? 'Número de pasaporte' 
      : 'Número de documento';
  }

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
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
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

  validarContrasena(password: string): void {
    this.requisitosContrasena = {
      longitud: password.length >= 8,
      mayuscula: /[A-Z]/.test(password),
      minuscula: /[a-z]/.test(password),
      numero: /\d/.test(password),
      especial: /[@$!%*?&]/.test(password),
    };
    this.contrasenaSegura = Object.values(this.requisitosContrasena).every(Boolean);
  }

  onContrasenaChange(): void {
    const password = this.registroForm.get('contrasena')?.value || '';
    this.validarContrasena(password);
  }

  onTipoDocumentoChange(): void {
    this.tipoDocumentoSeleccionado = this.registroForm.get('tipoDocumento')?.value || '';
    const numeroDoc = this.registroForm.get('numeroDocumento');
    
    if (this.tipoDocumentoSeleccionado === 'PASAPORTE') {
      numeroDoc?.setValidators([
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(12),
      ]);
    } else {
      numeroDoc?.setValidators([
        Validators.required,
        Validators.pattern(/^\d+$/),
        Validators.minLength(6),
        Validators.maxLength(10),
      ]);
    }
    numeroDoc?.updateValueAndValidity();
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

    if (!this.contrasenaSegura) {
      Swal.fire('Contraseña insegura', 'La contraseña debe cumplir todos los requisitos de seguridad.', 'warning');
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

    this.authService.register(data).subscribe({
      next: (response: any) => {
        const body = response.body || response;
        localStorage.setItem('pendingEmail', data.email);
        
        Swal.fire({
          icon: 'success',
          title: '¡Registro exitoso!',
          html: `
            <p>Hemos enviado un correo de verificación a <strong>${data.email}</strong>.</p>
            <p>Por favor, revisa tu bandeja de entrada y verifica tu correo para activar tu cuenta.</p>
          `,
          confirmButtonText: 'Entendido',
        }).then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: (err) => {
        console.error('Error en registro:', err);
        const mensaje = err.error?.message || err.error || 'Hubo un problema durante el registro.';
        Swal.fire({
          icon: 'error',
          title: 'Error al registrar',
          text: mensaje,
        });
      },
    });
  }
}