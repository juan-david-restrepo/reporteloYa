import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Reporte, EstadoReporte } from '../agente';
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

  EstadoReporte = EstadoReporte;

  abrir(r: Reporte) {
    this.verDetalle.emit(r);
  }

  filtroActivo: 'TODOS' | 'ACEPTADOS' | 'RECHAZADOS' = 'TODOS';

  cambiarFiltro(filtro: 'TODOS' | 'ACEPTADOS' | 'RECHAZADOS') {
    this.filtroActivo = filtro;
  }

  get historialFiltrado() {
    if (this.filtroActivo === 'ACEPTADOS') {
      // ✅ Comparación contra EstadoReporte enum (minúsculas)
      return this.historial.filter(h => h.estado === EstadoReporte.FINALIZADO);
    }

    if (this.filtroActivo === 'RECHAZADOS') {
      return this.historial.filter(h => h.estado === EstadoReporte.RECHAZADO);
    }

    return this.historial;
  }

  // ✅ Fecha formateada para mostrar
  getFechaDisplay(r: Reporte): string {
    const fecha = r.fechaFinalizado ?? r.fechaRechazado ?? r.fechaIncidente;
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }
}
