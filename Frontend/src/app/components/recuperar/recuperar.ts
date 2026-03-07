import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Nav } from '../../shared/nav/nav';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-recuperar',
  standalone: true,
  imports: [RouterLink, Nav, ReactiveFormsModule],
  templateUrl: './recuperar.html',
  styleUrls: ['./recuperar.css']
})
export class Recuperar {

  form!: FormGroup;
  loading = false;

  private readonly API_URL = 'http://localhost:8080/api/password/reset-request';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Correo inválido',
        text: 'Por favor ingresa un correo válido.'
      });
      return;
    }

    this.loading = true;

    // 🔹 Evita errores de parsing si backend devuelve string
    this.http.post(this.API_URL, { email: this.form.value.email }, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.loading = false;

          Swal.fire({
            title: 'Revisa tu correo',
            html: 'Se ha solicitado el restablecimiento de contraseña. Si tu correo está registrado, recibirás un enlace.',
            iconHtml: '<i class="fa-solid fa-envelope" style="font-size: 50px; color:#2563eb; animation: bounce 1s infinite;"></i>',
            showConfirmButton: true,
            confirmButtonText: 'Entendido',
            customClass: {
              popup: 'swal-popup-custom'
            }
          });

          this.form.reset();
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;

          let message = 'Error al procesar la solicitud.';
          if (err.error && typeof err.error === 'string') {
            message = err.error;
          } else if (err.message) {
            message = err.message;
          }

          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: message
          });

          console.error('Error real al enviar recuperación:', err);
        }
      });
  }
}