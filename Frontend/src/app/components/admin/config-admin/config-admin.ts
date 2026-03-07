import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarAdmin } from '../sidebar-admin/sidebar-admin';

@Component({
  selector: 'app-config-admin',
  templateUrl: './config-admin.html',
  styleUrls: ['./config-admin.css'],
  standalone: true, // Asegúrate de tener esto si usas imports directamente
  imports: [RouterModule, SidebarAdmin]
})
export class ConfigAdminComponent implements OnInit {

  // Al iniciar el componente, recuperamos las preferencias guardadas
  ngOnInit() {
    this.loadSettings();
  }

  private loadSettings() {
    // Recuperar Modo Oscuro
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');

    // Recuperar Daltonismo
    const isColorBlind = localStorage.getItem('colorBlind') === 'true';
    if (isColorBlind) document.body.classList.add('color-blind');

    // Recuperar Tamaño de fuente
    const savedSize = localStorage.getItem('fontSize') || 'normal';
    document.body.classList.add(`font-${savedSize}`);
  }

  toggleDarkMode(event: any) {
    const isChecked = event.target.checked;
    if (isChecked) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', isChecked.toString());
  }

  toggleColorBlindMode(event: any) {
    const isChecked = event.target.checked;
    if (isChecked) {
      document.body.classList.add('color-blind');
    } else {
      document.body.classList.remove('color-blind');
    }
    localStorage.setItem('colorBlind', isChecked.toString());
  }

  changeFontSize(event: any) {
    const size = event.target.value;
    
    // Limpiamos clases anteriores
    document.body.classList.remove('font-small', 'font-normal', 'font-large');
    
    // Aplicamos la nueva
    document.body.classList.add(`font-${size}`);
    
    // Guardamos preferencia
    localStorage.setItem('fontSize', size);
  }

  // Getters para que los checkboxes aparezcan marcados si ya estaban activos
  get isDarkActive(): boolean {
    return document.body.classList.contains('dark-mode');
  }

  get isColorBlindActive(): boolean {
    return document.body.classList.contains('color-blind');
  }

  get currentFontSize(): string {
    return localStorage.getItem('fontSize') || 'normal';
  }
}