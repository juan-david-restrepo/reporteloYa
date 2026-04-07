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
  terminosAceptados = false;
  mostrarContrasena = false;
  mostrarConfirmarContrasena = false;

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
      confirmarContrasena: ['', [Validators.required]],
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
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const contrasena = form.get('contrasena')?.value;
    const confirmarContrasena = form.get('confirmarContrasena')?.value;
    if (contrasena && confirmarContrasena && contrasena !== confirmarContrasena) {
      return { passwordMismatch: true };
    }
    return null;
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

  onCheckboxChange(): void {
    this.terminosAceptados = !this.terminosAceptados;
  }

  toggleMostrarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  toggleMostrarConfirmarContrasena(): void {
    this.mostrarConfirmarContrasena = !this.mostrarConfirmarContrasena;
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
      this.marcarCamposInvalidos();
      if (this.registroForm.errors?.['passwordMismatch']) {
        Swal.fire('Contraseñas no coinciden', 'Las contraseñas ingresadas son diferentes.', 'warning');
      } else {
        Swal.fire('Formulario incompleto', 'Por favor completa todos los campos correctamente.', 'warning');
      }
      return;
    }

    if (!this.contrasenaSegura) {
      Swal.fire('Contraseña insegura', 'La contraseña debe cumplir todos los requisitos de seguridad.', 'warning');
      return;
    }

    if (!this.terminosAceptados) {
      Swal.fire('Términos requeridos', 'Debes aceptar los términos y condiciones para continuar.', 'warning');
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
          showCancelButton: true,
          cancelButtonText: 'Reenviar correo',
          cancelButtonColor: '#6b7280'
        }).then((result) => {
          if (result.isDismissed) {
            this.reenviarCorreo(data.email);
          } else {
            this.router.navigate(['/login']);
          }
        });
      },
      error: (err) => {
        console.error('Error en registro:', err);
        this.manejarErrorRegistro(err);
      },
    });
  }

  private manejarErrorRegistro(err: any): void {
    let mensaje = err.error?.message || err.error || 'Hubo un problema durante el registro.';
    let errorKey: string | null = null;
    
    if (mensaje.includes('correo') && mensaje.includes('ya está registrado')) {
      this.registroForm.get('correo')?.setErrors({ alreadyExists: true });
      this.registroForm.get('correo')?.markAsTouched();
      this.marcarCamposInvalidos();
      return;
    }

    if (mensaje.includes('contraseña') && mensaje.includes('8 caracteres')) {
      this.registroForm.get('contrasena')?.setErrors({ weakPassword: true });
      this.registroForm.get('contrasena')?.markAsTouched();
      this.marcarCamposInvalidos();
      return;
    }

    if (mensaje.includes('nombre') && mensaje.includes('solo puede contener')) {
      this.registroForm.get('nombre')?.setErrors({ invalidFormat: true });
      this.registroForm.get('nombre')?.markAsTouched();
      this.marcarCamposInvalidos();
      return;
    }

    if (mensaje.includes('tipo de documento')) {
      this.registroForm.get('tipoDocumento')?.setErrors({ invalidType: true });
      this.registroForm.get('tipoDocumento')?.markAsTouched();
      this.marcarCamposInvalidos();
      return;
    }

    if (mensaje.includes('número de documento') || mensaje.includes('cédula') || mensaje.includes('pasaporte')) {
      this.registroForm.get('numeroDocumento')?.setErrors({ invalidNumber: true });
      this.registroForm.get('numeroDocumento')?.markAsTouched();
      this.marcarCamposInvalidos();
      return;
    }

    Swal.fire({
      icon: 'error',
      title: 'Error al registrar',
      text: mensaje,
    });
  }

  private marcarCamposInvalidos(): void {
    Object.keys(this.registroForm.controls).forEach(key => {
      const control = this.registroForm.get(key);
      if (control?.invalid) {
        control.markAsTouched();
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.registroForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) {
      return 'Este campo es requerido';
    }

    if (control.errors['email']) {
      return 'El formato del correo electrónico no es válido';
    }

    if (control.errors['maxlength']) {
      const max = control.errors['maxlength'].requiredLength;
      return `Máximo ${max} caracteres`;
    }

    if (control.errors['minlength']) {
      const min = control.errors['minlength'].requiredLength;
      return `Mínimo ${min} caracteres`;
    }

    if (control.errors['pattern']) {
      if (fieldName === 'nombre') return 'Solo se permiten letras y espacios';
      if (fieldName === 'numeroDocumento') return 'Solo se permiten números';
      if (fieldName === 'contrasena') return 'La contraseña no cumple los requisitos';
    }

    if (control.errors['alreadyExists']) {
      return 'Este correo ya está registrado';
    }

    if (control.errors['passwordMismatch']) {
      return 'Las contraseñas no coinciden';
    }

    if (control.errors['weakPassword']) {
      return 'La contraseña debe cumplir todos los requisitos';
    }

    if (control.errors['invalidFormat']) {
      return 'El formato no es válido';
    }

    if (control.errors['invalidType']) {
      return 'Tipo de documento inválido';
    }

    if (control.errors['invalidNumber']) {
      return 'Número de documento inválido';
    }

    return '';
  }

  private reenviarCorreo(email: string): void {
    this.authService.resendVerification(email).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Correo reenviado',
          html: `<p>Hemos enviado un nuevo correo de verificación a <strong>${email}</strong>.</p><p>Por favor, revisa tu bandeja de entrada.</p>`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#2563eb'
        }).then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo reenviar el correo de verificación.',
        });
      }
    });
  }
}