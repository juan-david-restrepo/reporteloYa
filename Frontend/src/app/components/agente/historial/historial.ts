import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Reporte } from '../agente';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-historial',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './historial.html',
  styleUrl: './historial.css',
})
export class Historial {
  @Input() historial!: Reporte[];

  @Output() verDetalle = new EventEmitter<Reporte>();

  abrir(r: Reporte){
    this.verDetalle.emit(r);
  }

  filtroActivo: 'TODOS' | 'ACEPTADOS' | 'RECHAZADOS' = 'TODOS';

  cambiarFiltro(filtro: 'TODOS' | 'ACEPTADOS' | 'RECHAZADOS'){
    this.filtroActivo = filtro;
  }

  get historialFiltrado(){
    if(this.filtroActivo === 'ACEPTADOS'){
      return this.historial.filter(h => h.estado === 'finalizado');
    }

    if(this.filtroActivo === 'RECHAZADOS'){
      return this.historial.filter(h => h.estado === 'rechazado');
    }

    return this.historial;
  }

}
