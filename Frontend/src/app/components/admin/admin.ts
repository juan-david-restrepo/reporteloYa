import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import Chart from 'chart.js/auto';
import { SidebarAdmin } from './sidebar-admin/sidebar-admin';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InfraccionService } from '../../service/infraccion.service';

type EstadoInfraccion = 'PENDIENTE' | 'RECHAZADO' | 'EN_PROCESO' | 'FINALIZADO';

interface Infraccion {
  id: number;
  fecha: string;
  tipo: string;
  agente: string;
  placa: string;
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

  menuAbierto = false;
  modalAbierto = false;
  tituloModal = '';
  tipoModalActivo: 'barras' | 'infraccion' = 'barras';

  infracciones: Infraccion[] = []; 
  infraccionesAMostrar: Infraccion[] = []; 
  itemsFiltrados: ItemFiltrado[] = [];
  infraccionSeleccionada: Infraccion | null = null;

  filtroTipoGrafico: string = 'todos';
  filtroTiempoGrafico: string = 'mes';

  tiposInfracciones: string[] = [];

  cargando: boolean = true;
  errorCarga: string = '';

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
    setTimeout(() => {
      this.crearGraficoBarras();
    }, 300);
  }

  ngOnDestroy(): void {
    if (this.chartBarras) {
      this.chartBarras.destroy();
    }
  }

  private cargarInfracciones(): void {
    this.cargando = true;
    this.errorCarga = '';
    
    this.infraccionService.getAllReportes().subscribe({
      next: (data) => {
        console.log('Datos recibidos del backend:', data);
        
        if (!data || data.length === 0) {
          console.warn('No hay reportes en la respuesta');
          this.infracciones = [];
          this.infraccionesAMostrar = [];
          this.cargando = false;
          return;
        }

        this.infracciones = this.mapearDatosInfraccion(data);
        this.infraccionesAMostrar = [...this.infracciones];
        
        console.log('Infracciones mapeadas:', this.infracciones);
        
        this.extraerTiposInfracciones();
        this.cargando = false;
        
        setTimeout(() => {
          this.actualizarGraficoBarras();
        }, 100);
      },
      error: (err) => {
        console.error('Error al cargar reportes:', err);
        this.errorCarga = 'Error al conectar con el servidor';
        this.cargando = false;
        this.infracciones = [];
        this.infraccionesAMostrar = [];
      }
    });
  }

  private mapearDatosInfraccion(data: any[]): Infraccion[] {
    return data.map((item: any) => {
      console.log('Mapeando item:', item);
      
      const agenteNombre = item.agente?.nombreCompleto || item.agente?.nombre || item.agente || 'Sin asignar';
      
      return {
        id: item.id || item.id_reporte,
        fecha: this.formatearFecha(item.createdAt || item.fechaIncidente || item.fecha),
        tipo: item.tipoInfraccion || item.tipo || 'Sin tipo',
        agente: agenteNombre,
        placa: item.placa || '',
        estado: this.mapearEstado(item.estado),
        ref: `INF-${item.id || item.id_reporte}`
      };
    });
  }

  private formatearFecha(fecha: string | undefined): string {
    if (!fecha) return new Date().toLocaleDateString('es-CO');
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return String(fecha);
    }
  }

  private mapearEstado(estado: string | undefined): EstadoInfraccion {
    if (!estado) return 'PENDIENTE';
    
    const mapeo: Record<string, EstadoInfraccion> = {
      'PENDIENTE': 'PENDIENTE',
      'EN_PROCESO': 'EN_PROCESO',
      'EN PROCESO': 'EN_PROCESO',
      'FINALIZADO': 'FINALIZADO',
      'RECHAZADO': 'RECHAZADO'
    };
    return mapeo[estado] || 'PENDIENTE';
  }

  private extraerTiposInfracciones(): void {
    const tiposSet = new Set<string>();
    this.infracciones.forEach(inf => {
      if (inf.tipo) {
        tiposSet.add(inf.tipo);
      }
    });
    this.tiposInfracciones = Array.from(tiposSet);
    console.log('Tipos de infracciones:', this.tiposInfracciones);
  }

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
      'EN_PROCESO': 'estado-proceso'
    };
    return clases[estado] || '';
  }

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
    if (!canvas) {
      console.warn('Canvas no encontrado');
      return;
    }

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
        plugins: { 
          legend: { display: false },
          title: {
            display: true,
            text: 'Distribución de Reportes por Tipo'
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0 }
          }
        }
      }
    });

    this.actualizarGraficoBarras();
  }

  private actualizarGraficoBarras(): void {
    if (!this.chartBarras) return;

    console.log('Actualizando gráfico con:', this.infracciones);

    const ahora = new Date();
    const datosFiltrados = this.infracciones.filter(inf => {
      const fechaInf = new Date(inf.fecha);
      
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

      const cumpleTipo = this.filtroTipoGrafico === 'todos' || inf.tipo === this.filtroTipoGrafico;

      return cumpleTiempo && cumpleTipo;
    });

    const conteo: Record<string, number> = {};
    datosFiltrados.forEach(inf => {
      conteo[inf.tipo] = (conteo[inf.tipo] || 0) + 1;
    });

    const labels = Object.keys(conteo);
    const data = Object.values(conteo);

    console.log('Datos para gráfico - Labels:', labels, 'Data:', data);

    if (labels.length === 0) {
      this.chartBarras.data.labels = ['Sin datos'];
      this.chartBarras.data.datasets[0].data = [0];
      this.chartBarras.data.datasets[0].backgroundColor = ['rgba(200, 200, 200, 0.5)'];
    } else {
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
    }

    this.chartBarras.update();
  }

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
