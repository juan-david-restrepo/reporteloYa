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

  // Propiedades de Estado
  menuAbierto = false;
  modalAbierto = false;
  tituloModal = '';
  tipoModalActivo: 'barras' | 'infraccion' = 'barras';

  // Datos
  infracciones: Infraccion[] = []; 
  infraccionesAMostrar: Infraccion[] = []; 
  itemsFiltrados: ItemFiltrado[] = [];
  infraccionSeleccionada: Infraccion | null = null;

  // Filtros de Gráfica
  filtroTipoGrafico: string = 'todos';
  filtroTiempoGrafico: string = 'mes';

  private chartBarras?: Chart;

  constructor(private infraccionService: InfraccionService) {}

  private loadSettings() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');

    const isColorBlind = localStorage.getItem('colorBlind') === 'true';
    if (isColorBlind) document.body.classList.add('color-blind');

    const savedSize = localStorage.getItem('fontSize') || 'normal';
    document.body.classList.add(`font-${savedSize}`);
  }

  ngOnInit(): void {
    this.loadSettings();
    this.cargarInfracciones();
  }

  ngAfterViewInit(): void {
    this.crearGraficoBarras();
  }

  ngOnDestroy(): void {
    if (this.chartBarras) {
      this.chartBarras.destroy();
    }
  }

  // =========================
  // CARGA DE DATOS
  // =========================
  private cargarInfracciones(): void {
    this.infraccionService.getInfracciones().subscribe(data => {
      this.infracciones = data;
      this.infraccionesAMostrar = data; 
      
      // Pequeño delay para asegurar que el canvas exista
      setTimeout(() => this.actualizarGraficoBarras(), 50);
    });
  }

  // =========================
  // MUNDO TABLA
  // =========================
  aplicarFiltro(event: Event): void {
    const estado = (event.target as HTMLSelectElement).value;
    this.infraccionesAMostrar = !estado 
      ? [...this.infracciones] 
      : this.infracciones.filter(inf => inf.estado === estado);
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
  // MUNDO GRÁFICO & FILTROS
  // =========================
  filtrarPorTiempo(event: Event): void {
    this.filtroTiempoGrafico = (event.target as HTMLSelectElement).value;
    this.actualizarGraficoBarras();
  }

  filtrarPorTipo(event: Event): void {
    this.filtroTipoGrafico = (event.target as HTMLSelectElement).value;
    this.actualizarGraficoBarras();
  }

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
          barThickness: 40,
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

    const ahora = new Date();
    const datosFiltrados = this.infracciones.filter(inf => {
      const fechaInf = new Date(inf.fecha);
      
      // Lógica de Tiempo
      let cumpleTiempo = true;
      if (this.filtroTiempoGrafico === 'hoy') {
        cumpleTiempo = fechaInf.toDateString() === ahora.toDateString();
      } else if (this.filtroTiempoGrafico === 'semana') {
        const haceUnaSemana = new Date();
        haceUnaSemana.setDate(ahora.getDate() - 7);
        cumpleTiempo = fechaInf >= haceUnaSemana;
      } else if (this.filtroTiempoGrafico === 'mes') {
        cumpleTiempo = fechaInf.getMonth() === ahora.getMonth() && fechaInf.getFullYear() === ahora.getFullYear();
      } else if (this.filtroTiempoGrafico === 'anio') {
        cumpleTiempo = fechaInf.getFullYear() === ahora.getFullYear();
      }

      // Lógica de Tipo
      const cumpleTipo = this.filtroTipoGrafico === 'todos' || inf.tipo === this.filtroTipoGrafico;

      return cumpleTiempo && cumpleTipo;
    });

    const conteo: Record<string, number> = {};
    datosFiltrados.forEach(inf => {
      conteo[inf.tipo] = (conteo[inf.tipo] || 0) + 1;
    });

    const labels = Object.keys(conteo);
    const data = Object.values(conteo);

    this.chartBarras.data.labels = labels;
    this.chartBarras.data.datasets[0].data = data;
    
    const colores = [
      'rgba(13, 110, 253, 0.75)', 
      'rgba(255, 193, 7, 0.75)',  
      'rgba(220, 53, 69, 0.75)',  
      'rgba(25, 135, 84, 0.75)',  
      'rgba(111, 66, 193, 0.75)'  
    ];

    this.chartBarras.data.datasets[0].backgroundColor = labels.map((_, i) => colores[i % colores.length]);
    this.chartBarras.data.datasets[0].borderColor = labels.map((_, i) => colores[i % colores.length].replace('0.75', '1'));

    this.chartBarras.update();
  }

  // =========================
  // MODALES Y NAVEGACIÓN
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
}