import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Nav } from '../../shared/nav/nav';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-registro',
  imports: [RouterLink, Nav, ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  registroForm: FormGroup;

  constructor(private fb: FormBuilder, private router: Router) {
    this.registroForm = this.fb.group({
      nombre: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', Validators.required],
      rol: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.registroForm.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor llena todos los campos correctamente.',
      });
      return;
    }

    const nuevoUsuario = this.registroForm.value;

    // Obtener usuarios existentes o crear un array vacío
    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');

    // Agregar el nuevo usuario
    usuarios.push(nuevoUsuario);

    // Guardar en localStorage
    localStorage.setItem('usuarios', JSON.stringify(usuarios));

    Swal.fire({
      icon: 'success',
      title: 'Usuario registrado correctamente',
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      this.router.navigate(['/login']); // Redirige al login
    });
  }
}
