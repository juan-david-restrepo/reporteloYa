import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthUser } from '../../service/auth.service';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-verificar-correo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Nav, Footer],
  templateUrl: './verificar-correo.html',
  styleUrls: ['./verificar-correo.css'],
})
export class VerificarCorreo implements OnInit {
  token: string = '';
  verificando: boolean = true;
  verificado: boolean = false;
  mensaje: string = '';
  email: string = '';
  mostrarReenviar: boolean = false;
  reenviando: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'];
      if (this.token) {
        this.verificarCorreo();
      } else {
        this.mostrarFormularioReenvio();
      }
    });

    const pendingEmail = localStorage.getItem('pendingEmail');
    if (pendingEmail) {
      this.email = pendingEmail;
    }
  }

  verificarCorreo(): void {
    this.verificando = true;
    this.authService.verifyEmail(this.token).subscribe({
      next: (response: any) => {
        const body = response.body || response;
        this.verificando = false;
        this.verificado = body.verified;
        this.mensaje = body.message;
        
        if (this.verificado) {
          localStorage.removeItem('pendingEmail');
          localStorage.setItem('userId', body.userId);
          localStorage.setItem('email', body.email);
          localStorage.setItem('role', body.role);
          
          const user: AuthUser = {
            userId: String(body.userId),
            email: body.email,
            role: body.role
          };
          this.authService.setCurrentUser(user);
          this.authService.setAuthenticated(true);
          
          Swal.fire({
            icon: 'success',
            title: '¡Verificación exitosa!',
            text: 'Redirigiendo al home...',
            timer: 2000,
            showConfirmButton: false,
          }).then(() => {
            if (body.role === 'ADMIN') {
              this.router.navigate(['/admin']);
            } else if (body.role === 'AGENTE') {
              this.router.navigate(['/agente']);
            } else {
              this.router.navigate(['/home']);
            }
          });
        }
      },
      error: (err) => {
        this.verificando = false;
        this.verificado = false;
        const body = err.error?.body || err.error;
        this.mensaje = body?.message || 'Error al verificar el correo.';
        this.mostrarReenviar = true;
      },
    });
  }

  mostrarFormularioReenvio(): void {
    this.verificando = false;
    this.mostrarReenviar = true;
  }

  reenviarCorreo(): void {
    if (!this.email) {
      Swal.fire('Error', 'Por favor ingresa tu correo electrónico.', 'warning');
      return;
    }

    this.reenviando = true;
    this.authService.resendVerification(this.email).subscribe({
      next: (response: any) => {
        this.reenviando = false;
        Swal.fire({
          icon: 'success',
          title: 'Correo reenviado',
          html: `<p>Hemos enviado un nuevo correo de verificación a <strong>${this.email}</strong>.</p>`,
        });
      },
      error: (err) => {
        this.reenviando = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error || 'No se pudo reenviar el correo de verificación.',
        });
      },
    });
  }
}
