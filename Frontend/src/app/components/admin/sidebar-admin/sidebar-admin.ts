/*=================================================================
  COMPONENTE: SIDEBAR ADMINISTRADOR
  Función: Menú lateral de navegación para el panel de admin.
  Incluye enlaces a las diferentes secciones y botón de logout.
=================================================================*/

/*------------------ IMPORTACIONES ------------------
  Angular Core: Componente e interfaz de ciclo de vida
  RouterModule: Para enlaces de navegación
  AuthService: Servicio de autenticación
*/
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../service/auth.service';


/*========================================================
  DECORADOR @COMPONENT
=========================================================*/
@Component({
  selector: 'app-sidebar-admin',    // Etiqueta HTML
  imports: [RouterModule],          // Módulo de rutas
  templateUrl: './sidebar-admin.html', // Plantilla HTML
  styleUrl: './sidebar-admin.css',    // Estilos CSS
})


/*========================================================
  CLASE PRINCIPAL
  Implementa OnInit para cargar configuraciones
=========================================================*/
export class SidebarAdmin implements OnInit {

  /*------------------ CONSTRUCTOR ------------------
    Inicializa los servicios necesarios
  */
  constructor(
    private authService: AuthService,  // Servicio de autenticación
    private router: Router,             // Para navegar después del logout
  ) {}


  /*------------------ ngOnInit - INICIALIZACIÓN ------------------*/
  ngOnInit() {
    this.loadSettings();
  }


  /*------------------ CARGA DE CONFIGURACIÓN ------------------
    Lee las preferencias del usuario (modo oscuro, tamaño de fuente)
  */
  private loadSettings() {
    // Carga modo oscuro
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');

    // Carga tamaño de fuente
    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
      document.body.style.setProperty('--admin-font-size', savedSize + 'px');
    }
  }


  /*------------------ LOGOUT ------------------
    Cierra la sesión del administrador
    Navega a la página de login después de cerrar
  */
  logout_admin() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
