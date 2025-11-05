import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Registro } from '../registro/registro';
import { Recuperar } from '../recuperar/recuperar';
import { Nav } from '../../shared/nav/nav';
import { ChatBotComponent } from '../../shared/chat-bot/chat-bot';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-login',
  imports: [RouterLink, CommonModule, Registro, Recuperar, Nav, ChatBotComponent, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  formLogin: FormGroup;

  constructor(private fb: FormBuilder, private router: Router) {
    this.formLogin = this.fb.group({
      rol: ['', Validators.required],
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
        confirmButtonText: 'Entendido',
      });
      return;
    }

    const { rol, email, password } = this.formLogin.value;

    if (!rol) {
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona un rol',
        text: 'Debes seleccionar tu tipo de usuario para continuar.',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    // Guardar datos en localStorage
    localStorage.setItem(
      'usuario',
      JSON.stringify({ rol, email, password })
    );

    console.log(
      'Usuario guardado en localStorage:',
      JSON.parse(localStorage.getItem('usuario')!)
    );

    Swal.fire({
      icon: 'success',
      title: `Bienvenido, ${rol.charAt(0).toUpperCase() + rol.slice(1)}!`,
      text: 'Redirigiendo a tu panel...',
      showConfirmButton: false,
      timer: 1800,
      timerProgressBar: true,
    }).then(() => {
      // Redirección según el rol
      if (rol === 'administrador') {
        this.router.navigate(['/admin']);
      } else if (rol === 'agente') {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/']);
      }
    });
  }
}
