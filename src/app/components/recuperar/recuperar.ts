import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Nav } from '../../shared/nav/nav';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-recuperar',
  imports: [RouterLink, Nav, ReactiveFormsModule],
  templateUrl: './recuperar.html',
  styleUrl: './recuperar.css',
})
export class Recuperar {
  resetForm: FormGroup;
  mostrarPassword = false;
  mostrarConfirm = false;

  constructor(private fb: FormBuilder, private router: Router) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  // ✅ Método para alternar visibilidad de contraseñas
  togglePassword(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.mostrarPassword = !this.mostrarPassword;
    } else {
      this.mostrarConfirm = !this.mostrarConfirm;
    }
  }

  // ✅ Método para enviar formulario
  onSubmit(): void {
    const { password, confirmPassword } = this.resetForm.value;

    if (password !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Las contraseñas no coinciden',
        text: 'Por favor, verifica e inténtalo nuevamente.',
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title: 'Contraseña restablecida correctamente',
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      this.router.navigate(['/login']); // Redirige al login
    });
  }
}
