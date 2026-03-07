import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type VistaAgente =
 | 'dashboard'
 | 'reportes'
 | 'tareas'
 | 'historial'
 | 'perfil'
 | 'configuracion';

@Component({
  selector: 'app-sidebar-agente',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './sidebar-agente.html',
  styleUrl: './sidebar-agente.css',
})
export class SidebarAgente {
  @Output() logout = new EventEmitter<void>();

  @Input() vistaActual!: VistaAgente;
  @Output() vistaChange = new EventEmitter<VistaAgente>();

  cambiar(v: VistaAgente){
    this.vistaChange.emit(v);
  }
}
