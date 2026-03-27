/*=================================================================
  COMPONENTE: CONFIGURACIÓN DEL ADMINISTRADOR
  Función: Panel de configuración que permite al administrador
  personalizar la interfaz (modo oscuro, tamaño de fuente).
  Las preferencias se guardan en localStorage para persistir.
=================================================================*/

/*------------------ IMPORTACIONES ------------------
  Angular Core: Componente e interfaz de ciclo de vida
  RouterModule: Navegación
  SidebarAdmin: Menú lateral del admin
  FormsModule: Para usar ngModel (two-way binding)
*/
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarAdmin } from '../sidebar-admin/sidebar-admin';
import { FormsModule } from '@angular/forms';


/*========================================================
  DECORADOR @COMPONENT
  Configuración base del componente
=========================================================*/
@Component({
  selector: 'app-config-admin',      // Etiqueta HTML para usar este componente
  templateUrl: './config-admin.html',  // Plantilla HTML
  styleUrls: ['./config-admin.css'],   // Estilos CSS
  standalone: true,                   // Componente independiente
  imports: [RouterModule, SidebarAdmin, FormsModule]  // Módulos necesarios
})

/*========================================================
  CLASE PRINCIPAL
  Implementa OnInit para cargar configuraciones al iniciar
=========================================================*/
export class ConfigAdminComponent implements OnInit {

  /*------------------ 1. PROPIEDADES PÚBLICAS ------------------
    Variables accesibles desde la plantilla HTML
  */
  
  fontSizeValue: number = 15;  // Tamaño de fuente actual (default: 15px)


  /*------------------ 2. ngOnInit - INICIALIZACIÓN ------------------
    Se ejecuta al iniciar el componente
    Carga las preferencias guardadas previamente
  */
  ngOnInit() {
    this.loadSettings();
  }


  /*------------------ 3. CARGA DE CONFIGURACIÓN ------------------
    Lee las preferencias del usuario desde localStorage
    Aplica el modo oscuro y el tamaño de fuente guardados
  */
  private loadSettings() {
    // Carga modo oscuro
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');

    // Carga tamaño de fuente
    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
      // Si existe un tamaño guardado, lo usa
      this.fontSizeValue = parseInt(savedSize);
      document.body.style.setProperty('--admin-font-size', savedSize + 'px');
    } else {
      // Si no existe, establece el default y lo guarda
      document.body.style.setProperty('--admin-font-size', '15px');
      localStorage.setItem('fontSize', '15');
    }
  }


  /*------------------ 4. MODO OSCURO ------------------
    Alterna entre modo claro y oscuro
    Guarda la preferencia en localStorage
  */
  toggleDarkMode(event: any) {
    // Obtiene el estado del checkbox
    const isChecked = event.target.checked;
    
    // Agrega o quita la clase CSS según el estado
    if (isChecked) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    
    // Guarda la preferencia en localStorage
    localStorage.setItem('darkMode', isChecked.toString());
  }


  /*------------------ 5. CAMBIAR TAMAÑO DE FUENTE ------------------
    Actualiza el tamaño de fuente de la interfaz
    Se activa al mover el slider
  */
  changeFontSize(event: any) {
    // Obtiene el valor (soporta tanto number como event)
    const size = typeof event === 'number' ? event : event.target.value;
    
    // Actualiza la variable
    this.fontSizeValue = size;
    
    // Aplica el tamaño como variable CSS global
    document.body.style.setProperty('--admin-font-size', size + 'px');
    
    // Guarda en localStorage
    localStorage.setItem('fontSize', size);
  }


  /*------------------ 6. RESTABLECER TAMAÑO DE FUENTE ------------------
    Restaura el tamaño de fuente al valor default (15px)
  */
  resetFontSize() {
    this.fontSizeValue = 15;
    document.body.style.setProperty('--admin-font-size', '15px');
    localStorage.setItem('fontSize', '15');
  }


  /*------------------ 7. GETTER isDarkActive ------------------
    Retorna true si el modo oscuro está activo
    Se usa para marcar el checkbox inicialmente
  */
  get isDarkActive(): boolean {
    return document.body.classList.contains('dark-mode');
  }
}