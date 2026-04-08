import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Reporte, EstadoReporte } from '../agente';
import { CommonModule } from '@angular/common';
import { AgenteServiceTs } from '../../../service/agente.service';

@Component({
  selector: 'app-historial',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './historial.html',
  styleUrl: './historial.css',
})
export class Historial implements OnInit {
  @Input() filtroInicial: 'TODOS' | 'ACEPTADOS' | 'RECHAZADOS' = 'TODOS';

  @Input() historial!: Reporte[];
  @Input() perfilAgenteNombre: string = '';
  @Input() perfilAgentePlaca: string = '';
  @Output() verDetalle = new EventEmitter<Reporte>();

  EstadoReporte = EstadoReporte;

  constructor(private agenteService: AgenteServiceTs) {}

  abrir(r: Reporte) {
    this.verDetalle.emit(r);
  }

  descargarPdf(r: Reporte, event: Event) {
    event.stopPropagation();
    
    console.log('PDF - perfilAgenteNombre:', this.perfilAgenteNombre);
    console.log('PDF - perfilAgentePlaca:', this.perfilAgentePlaca);
    console.log('PDF - r.nombreAgente:', r.nombreAgente);
    console.log('PDF - r.placaAgente:', r.placaAgente);
    
    const reporteConPerfil = {
      ...r,
      nombreAgente: this.perfilAgenteNombre || r.nombreAgente || '',
      placaAgente: this.perfilAgentePlaca || r.placaAgente || ''
    };
    
    console.log('PDF - reporteConPerfil:', reporteConPerfil);
    
    this.agenteService.generarPdfOperativo(reporteConPerfil).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `operativo_${r.id}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al generar PDF:', err);
        alert('Error al generar el PDF');
      }
    });
  }

  ngOnInit(){
    this.filtroActivo = this.filtroInicial;
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
