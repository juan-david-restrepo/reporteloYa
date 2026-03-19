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
  descripcion?: string;
  resumen?: string;
  ubicacion?: string;
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

  // Filtros de Tabla
  filtroTablaTipo: string = '';
  filtroTablaEstado: string = '';

  // Filtro del Modal
  filtroEstadoModal: string = '';

  private chartBarras?: Chart;

  constructor(private infraccionService: InfraccionService) {}

  private loadSettings() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');

    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
      document.body.style.setProperty('--admin-font-size', savedSize + 'px');
    }
  }

  ngOnInit(): void {
    this.loadSettings();
    this.cargarInfracciones();
  }

  refreshData(): void {
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
  filtrarTablaPorTipo(event: Event): void {
    this.filtroTablaTipo = (event.target as HTMLSelectElement).value;
    this.aplicarFiltrosTabla();
  }

  aplicarFiltro(event: Event): void {
    this.filtroTablaEstado = (event.target as HTMLSelectElement).value;
    this.aplicarFiltrosTabla();
  }

  private aplicarFiltrosTabla(): void {
    let filtradas = [...this.infracciones];

    if (this.filtroTablaTipo) {
      filtradas = filtradas.filter(inf => this.getNombreTipo(inf.tipo) === this.filtroTablaTipo);
    }

    if (this.filtroTablaEstado) {
      filtradas = filtradas.filter(inf => inf.estado === this.filtroTablaEstado);
    }

    this.infraccionesAMostrar = filtradas;
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

  getNombreTipo(tipo: string): string {
    const nombres: Record<string, string> = {
      'Accidente de tránsito': 'Accidente de tránsito',
      'Vehículo mal estacionado': 'Vehículo mal estacionado',
      'Semáforo dañado': 'Semáforo dañado',
      'Conducción peligrosa': 'Conducción peligrosa',
      'Otros': 'Otros',
      'Exceso de velocidad': 'Accidente de tránsito',
      'Semáforo en Rojo': 'Semáforo dañado',
      'Accidente': 'Accidente de tránsito',
      'Manejo errático': 'Conducción peligrosa'
    };
    return nombres[tipo] || tipo;
  }

  getCountByEstado(estado: string): number {
    return this.infraccionesAMostrar.filter(inf => inf.estado === estado).length;
  }

  filtrarPorEstadoModal(estado: string): void {
    this.filtroEstadoModal = this.filtroEstadoModal === estado ? '' : estado;
  }

  get reportesFiltrados(): Infraccion[] {
    if (!this.filtroEstadoModal) {
      return this.infraccionesAMostrar;
    }
    return this.infraccionesAMostrar.filter(inf => inf.estado === this.filtroEstadoModal);
  }

  isEstadoActivo(estado: string): boolean {
    return this.filtroEstadoModal === estado;
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
      const cumpleTipo = this.filtroTipoGrafico === 'todos' || this.getNombreTipo(inf.tipo) === this.filtroTipoGrafico;

      return cumpleTiempo && cumpleTipo;
    });

    const conteo: Record<string, number> = {};
    datosFiltrados.forEach(inf => {
      const tipoNormalizado = this.getNombreTipo(inf.tipo);
      conteo[tipoNormalizado] = (conteo[tipoNormalizado] || 0) + 1;
    });

    // Mapeo de tipos a labels cortos
    const labelsMap: Record<string, string> = {
      'Accidente de tránsito': 'Accidente',
      'Vehículo mal estacionado': 'Mal Estacionado',
      'Semáforo dañado': 'Semáforo Dañado',
      'Conducción peligrosa': 'Conducción Peligrosa',
      'Otros': 'Otros'
    };

    const labels = Object.keys(conteo).map(tipo => labelsMap[tipo] || tipo);
    const data = Object.values(conteo);

    this.chartBarras.data.labels = labels;
    this.chartBarras.data.datasets[0].data = data;
    
    // Colores específicos para cada tipo
    const simpleColors: Array<{ bg: string; border: string }> = [
      { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgba(239, 68, 68, 1)' },      // Rojo - Accidente
      { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgba(249, 115, 22, 1)' },    // Naranja - Mal Estacionado
      { bg: 'rgba(234, 179, 8, 0.8)', border: 'rgba(234, 179, 8, 1)' },       // Amarillo - Semáforo
      { bg: 'rgba(139, 92, 246, 0.8)', border: 'rgba(139, 92, 246, 1)' },     // Púrpura - Conducción Peligrosa
      { bg: 'rgba(107, 114, 128, 0.8)', border: 'rgba(107, 114, 128, 1)' }    // Gris - Otros
    ];

    this.chartBarras.data.datasets[0].backgroundColor = labels.map((_, i) => simpleColors[i % simpleColors.length].bg);
    this.chartBarras.data.datasets[0].borderColor = labels.map((_, i) => simpleColors[i % simpleColors.length].border);

    this.chartBarras.update();
  }

  // =========================
  // MODALES Y NAVEGACIÓN
  // =========================
  abrirModalBarras(): void {
    this.tipoModalActivo = 'barras';
    this.tituloModal = 'Análisis de Reportes';
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