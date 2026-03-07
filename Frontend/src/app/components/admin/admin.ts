import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import Chart from 'chart.js/auto';
import { SidebarAdmin } from './sidebar-admin/sidebar-admin';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InfraccionService } from '../../service/infraccion.service';

type EstadoInfraccion = 'PENDIENTE' | 'RECHAZADO' | 'EN PROCESO' | 'FINALIZADO';

interface Infraccion {
  id: number;
  fecha: string;
  tipo: string;
  agente: string;
  estado: EstadoInfraccion;
  ref: string;
}

interface ItemFiltrado {
  ref: string;
  descripcion: string;
  cantidad: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
  imports: [SidebarAdmin, RouterModule, CommonModule, FormsModule]
})
export class Admin implements OnInit, AfterViewInit, OnDestroy {

  constructor(private infraccionService: InfraccionService) {}

  menuAbierto = false;
  modalAbierto = false;
  tituloModal = '';
  tipoModalActivo: 'barras' | 'infraccion' = 'barras';

  itemsFiltrados: ItemFiltrado[] = [];
  infraccionSeleccionada: Infraccion | null = null;

  infracciones: Infraccion[] = []; // Datos maestros
  infraccionesAMostrar: Infraccion[] = []; // Solo para la tabla

  private chartBarras?: Chart;

  ngOnInit(): void {
    this.infraccionService.getInfracciones().subscribe(data => {
      this.infracciones = data;
      this.infraccionesAMostrar = data; // Inicialmente iguales
      
      setTimeout(() => {
        this.actualizarGraficoBarras();
      }, 50);
    });
  }

  ngAfterViewInit(): void {
    this.crearGraficoBarras();
  }

  ngOnDestroy(): void {
    this.chartBarras?.destroy();
  }

  // =========================
  // MUNDO TABLA (INDEPENDIENTE)
  // =========================
  aplicarFiltro(event: Event): void {
    const estado = (event.target as HTMLSelectElement).value;
    if (!estado) {
      this.infraccionesAMostrar = [...this.infracciones];
    } else {
      this.infraccionesAMostrar = this.infracciones.filter(inf => inf.estado === estado);
    }
    // NOTA: Ya no llamamos a actualizarGraficoBarras aquí para no mezclar mundos
  }

  getClaseEstado(estado: EstadoInfraccion): string {
    const clases: Record<EstadoInfraccion, string> = {
      'PENDIENTE': 'estado-pendiente',
      'FINALIZADO': 'estado-finalizado',
      'RECHAZADO': 'estado-rechazado',
      'EN PROCESO': 'estado-proceso'
    };
    return clases[estado] || '';
  }

  // =========================
  // MODALES Y OTROS
  // =========================
  abrirModalBarras(): void {
    this.tipoModalActivo = 'barras';
    this.tituloModal = 'Análisis Estadístico de Infracciones';

    const conteoPorTipo: Record<string, number> = {};
    this.infracciones.forEach(inf => {
      conteoPorTipo[inf.tipo] = (conteoPorTipo[inf.tipo] || 0) + 1;
    });

    this.itemsFiltrados = Object.keys(conteoPorTipo).map(tipo => ({
      ref: tipo,
      descripcion: `Reportes registrados en el sistema`,
      cantidad: conteoPorTipo[tipo]
    }));

    this.modalAbierto = true;
    document.body.classList.add('modal-open');
  }

  abrirDetalleInfraccion(infraccion: Infraccion): void {
    this.tipoModalActivo = 'infraccion';
    this.tituloModal = `Detalle de Registro: ${infraccion.ref}`;
    this.infraccionSeleccionada = infraccion;
    this.modalAbierto = true;
    document.body.classList.add('modal-open');
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.infraccionSeleccionada = null;
    document.body.classList.remove('modal-open');
  }

  // =========================
  // MUNDO GRÁFICO
  // =========================
  private crearGraficoBarras(): void {
    const canvas = document.getElementById('barChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.chartBarras = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Cantidad',
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 2,
          borderRadius: 5,
          barThickness: 40, // Grosor elegante fijo
          maxBarThickness: 50
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0 }
          }
        }
      }
    });
  }

  private actualizarGraficoBarras(): void {
    if (!this.chartBarras) return;

    const conteoPorTipo: Record<string, number> = {};
    // USAMOS EL TOTAL (this.infracciones), no el filtro de la tabla
    this.infracciones.forEach(inf => {
      conteoPorTipo[inf.tipo] = (conteoPorTipo[inf.tipo] || 0) + 1;
    });

    const labels = Object.keys(conteoPorTipo);
    const data = Object.values(conteoPorTipo);

    this.chartBarras.data.labels = labels;
    this.chartBarras.data.datasets[0].data = data;
    
    const colores = ['rgba(255, 204, 0, 0.7)', 'rgba(255, 77, 77, 0.7)', 'rgba(51, 181, 229, 0.7)', 'rgba(76, 175, 80, 0.7)', 'rgba(156, 39, 176, 0.7)'];
    this.chartBarras.data.datasets[0].backgroundColor = labels.map((_, i) => colores[i % colores.length]);
    this.chartBarras.data.datasets[0].borderColor = labels.map((_, i) => colores[i % colores.length].replace('0.7', '1'));

    this.chartBarras.update();
  }
}