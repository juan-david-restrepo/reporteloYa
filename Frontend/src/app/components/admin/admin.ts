import { Component, AfterViewInit, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import Chart from 'chart.js/auto';
import { SidebarAdmin } from './sidebar-admin/sidebar-admin';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InfraccionService, AdminDashboard } from '../../service/infraccion.service';

interface ReporteAdmin {
  id: number;
  ref: string;
  fecha: string;
  tipo: string;
  tipoInfraccion?: string;
  agente: string;
  nombreAgente?: string;
  placaAgente?: string;
  placa?: string;
  estado: string;
  descripcion?: string;
  resumen?: string;
  resumenOperativo?: string;
  ubicacion?: string;
  direccion?: string;
  prioridad?: string;
  fechaIncidente?: string;
  horaIncidente?: string;
  urlFoto?: string;
  fechaAceptado?: string;
  fechaFinalizado?: string;
  fechaRechazado?: string;
  acompanado?: boolean;
  placaCompanero?: string;
  nombreCompanero?: string;
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

  infracciones: ReporteAdmin[] = [];
  infraccionesAMostrar: ReporteAdmin[] = [];
  infraccionSeleccionada: ReporteAdmin | null = null;

  filtroTipoGrafico = 'todos';
  filtroTiempoGrafico = 'mes';

  filtroTablaTipo = '';
  filtroTablaEstado = '';

  filtroEstadoModal = '';

  dashboard: AdminDashboard | null = null;

  chartBarras: any;
  cargando = true;
  errorCarga = '';
  debugInfo = '';

  constructor(
    private infraccionService: InfraccionService,
    private cdr: ChangeDetectorRef
  ) {}

  private loadSettings(): void {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');

    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
      document.body.style.setProperty('--admin-font-size', savedSize + 'px');
    }
  }

  ngOnInit(): void {
    console.log('=== Admin ngOnInit ===');
    this.loadSettings();
    this.cargarInfracciones();
  }

  refreshData(): void {
    this.cargarInfracciones();
  }

  ngAfterViewInit(): void {
    console.log('=== Admin ngAfterViewInit ===');
    setTimeout(() => {
      this.inicializarGrafico();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.chartBarras) {
      this.chartBarras.destroy();
    }
  }

  private cargarInfracciones(): void {
    this.cargando = true;
    this.errorCarga = '';
    this.debugInfo = 'Cargando...';

    console.log('=== Llamando API ===');

    this.infraccionService.getInfraccionesSimple().subscribe({
      next: (response: any) => {
        console.log('=== API Response ===', response);
        
        let items: any[] = [];
        
        if (!response) {
          this.debugInfo = 'Response vacío';
          items = [];
        } else if (Array.isArray(response)) {
          this.debugInfo = 'Response es array';
          items = response;
        } else if (response.content && Array.isArray(response.content)) {
          this.debugInfo = 'Response tiene content';
          items = response.content;
        } else {
          this.debugInfo = 'Response es objeto: ' + JSON.stringify(response).substring(0, 100);
        }
        
        console.log('Items length:', items.length);
        
        this.infracciones = items.map((item: any) => this.transformarReporte(item));
        this.infraccionesAMostrar = [...this.infracciones];
        this.cargando = false;
        
        this.debugInfo = `Cargados: ${this.infracciones.length}`;
        console.log('=== Final ===', this.infracciones);
        
        this.cdr.detectChanges();
        
        setTimeout(() => {
          if (!this.chartBarras) {
            this.inicializarGrafico();
          } else {
            this.actualizarGraficoBarras();
          }
        }, 300);
      },
      error: (err) => {
        console.error('=== Error API ===', err);
        this.errorCarga = 'Error: ' + (err.message || err.statusText || 'Error desconocido');
        this.cargando = false;
        this.infracciones = [];
        this.infraccionesAMostrar = [];
        this.debugInfo = 'Error: ' + this.errorCarga;
        this.cdr.detectChanges();
      }
    });

    this.infraccionService.getEstadisticasAdmin().subscribe({
      next: (data) => {
        console.log('=== Dashboard ===', data);
        this.dashboard = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error estadísticas:', err);
      }
    });
  }

  private inicializarGrafico(): void {
    const canvas = document.getElementById('barChart') as HTMLCanvasElement;
    if (!canvas) {
      console.log('Canvas no encontrado');
      return;
    }

    if (this.chartBarras) {
      this.chartBarras.destroy();
    }

    try {
      this.chartBarras = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            label: 'Cantidad',
            data: [0],
            backgroundColor: ['rgba(200, 200, 200, 0.5)'],
            borderColor: ['rgba(150, 150, 150, 1)'],
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
      console.log('Gráfico inicializado');
    } catch (error) {
      console.error('Error al crear gráfico:', error);
    }
  }

  private transformarReporte(data: any): ReporteAdmin {
    console.log('Transformando:', JSON.stringify(data, null, 2));
    console.log('Transformando:', data);
    
    let urlFoto = '';
    if (data.evidencias && data.evidencias.length > 0) {
      urlFoto = data.evidencias[0].archivo || '';
    }

    let nombreAgente = '';
    let placaAgente = '';
    if (data.agente) {
      nombreAgente = data.agente.nombreCompleto || data.agente.nombre || '';
      placaAgente = data.agente.placa || '';
    }
    if (!placaAgente && data.placaAgente) {
      placaAgente = data.placaAgente;
    }
    if (!nombreAgente && data.nombreAgente) {
      nombreAgente = data.nombreAgente;
    }

    let placaCompanero = '';
    let nombreCompanero = '';
    if (data.agenteCompanero) {
      placaCompanero = data.agenteCompanero.placa || '';
      nombreCompanero = data.agenteCompanero.nombreCompleto || data.agenteCompanero.nombre || '';
    } else if (data.placaCompanero) {
      placaCompanero = data.placaCompanero;
    }

    return {
      id: data.id || 0,
      ref: `INF-${String(data.id || 0).padStart(3, '0')}`,
      fecha: this.extraerFecha(data),
      tipo: data.tipoInfraccion || data.tipo || 'Otros',
      tipoInfraccion: data.tipoInfraccion,
      agente: nombreAgente || placaAgente || 'Sin asignar',
      nombreAgente: nombreAgente,
      placaAgente: placaAgente,
      placa: data.placa || '',
      estado: this.normalizarEstado(data.estado),
      descripcion: data.descripcion,
      resumen: data.resumenOperativo,
      resumenOperativo: data.resumenOperativo,
      ubicacion: data.direccion,
      direccion: data.direccion,
      prioridad: data.prioridad,
      fechaIncidente: data.fechaIncidente,
      horaIncidente: data.horaIncidente ? data.horaIncidente.substring(0, 5) : '',
      urlFoto: urlFoto,
      fechaAceptado: data.fechaAceptado,
      fechaFinalizado: data.fechaFinalizado,
      fechaRechazado: data.fechaRechazado,
      acompanado: data.acompanado ?? false,
      placaCompanero: placaCompanero,
      nombreCompanero: nombreCompanero
    };
  }

  private extraerFecha(data: any): string {
    if (data.fechaIncidente) return data.fechaIncidente;
    if (data.fecha) return data.fecha;
    if (data.createdAt) {
      if (typeof data.createdAt === 'string') {
        return data.createdAt.split('T')[0];
      }
      if (data.createdAt.date) {
        return data.createdAt.date;
      }
    }
    return new Date().toISOString().split('T')[0];
  }

  private normalizarEstado(estado: any): string {
    if (!estado) return 'PENDIENTE';
    const estadoStr = String(estado).toUpperCase();
    if (estadoStr === 'PENDIENTE') return 'PENDIENTE';
    if (estadoStr === 'EN_PROCESO' || estadoStr === 'EN PROCESO') return 'EN PROCESO';
    if (estadoStr === 'FINALIZADO') return 'FINALIZADO';
    if (estadoStr === 'RECHAZADO') return 'RECHAZADO';
    return 'PENDIENTE';
  }

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

  getClaseEstado(estado: string): string {
    const clases: Record<string, string> = {
      'PENDIENTE': 'estado-pendiente',
      'FINALIZADO': 'estado-finalizado',
      'RECHAZADO': 'estado-rechazado',
      'EN PROCESO': 'estado-proceso',
      'EN_PROCESO': 'estado-proceso'
    };
    return clases[estado] || '';
  }

  getNombreTipo(tipo: any): string {
    if (!tipo) return 'Otros';
    const nombres: Record<string, string> = {
      'Accidente de tránsito': 'Accidente de tránsito',
      'Vehículo mal estacionado': 'Vehículo mal estacionado',
      'Semáforo dañado': 'Semáforo dañado',
      'Conducción peligrosa': 'Conducción peligrosa',
      'Otros': 'Otros',
      'Exceso de velocidad': 'Accidente de tránsito',
      'Semáforo en Rojo': 'Semáforo dañado',
      'Accidente': 'Accidente de tránsito',
      'Manejo errático': 'Conducción peligrosa',
      'Invasión de carril': 'Conducción peligrosa'
    };
    return nombres[tipo] || tipo;
  }

  getCountByEstado(estado: string): number {
    return this.infraccionesAMostrar.filter(inf => inf.estado === estado).length;
  }

  filtrarPorEstadoModal(estado: string): void {
    this.filtroEstadoModal = this.filtroEstadoModal === estado ? '' : estado;
  }

  get reportesFiltrados(): ReporteAdmin[] {
    if (!this.filtroEstadoModal) {
      return this.infraccionesAMostrar;
    }
    return this.infraccionesAMostrar.filter(inf => inf.estado === this.filtroEstadoModal);
  }

  isEstadoActivo(estado: string): boolean {
    return this.filtroEstadoModal === estado;
  }

  filtrarPorTiempo(event: Event): void {
    this.filtroTiempoGrafico = (event.target as HTMLSelectElement).value;
    this.actualizarGraficoBarras();
  }

  filtrarPorTipo(event: Event): void {
    this.filtroTipoGrafico = (event.target as HTMLSelectElement).value;
    this.actualizarGraficoBarras();
  }

  private actualizarGraficoBarras(): void {
    if (!this.chartBarras) {
      this.inicializarGrafico();
      return;
    }

    const ahora = new Date();
    const datosFiltrados = this.infracciones.filter(inf => {
      if (!inf.fecha) return false;
      
      const fechaInf = new Date(inf.fecha);
      if (isNaN(fechaInf.getTime())) return false;
      
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

      const cumpleTipo = this.filtroTipoGrafico === 'todos' || this.getNombreTipo(inf.tipo) === this.filtroTipoGrafico;

      return cumpleTiempo && cumpleTipo;
    });

    const conteo: Record<string, number> = {};
    datosFiltrados.forEach(inf => {
      const tipoNormalizado = this.getNombreTipo(inf.tipo);
      conteo[tipoNormalizado] = (conteo[tipoNormalizado] || 0) + 1;
    });

    const labelsMap: Record<string, string> = {
      'Accidente de tránsito': 'Accidente',
      'Vehículo mal estacionado': 'Mal Estacionado',
      'Semáforo dañado': 'Semáforo Dañado',
      'Conducción peligrosa': 'Conducción Peligrosa',
      'Otros': 'Otros'
    };

    const labels = Object.keys(conteo).map(tipo => labelsMap[tipo] || tipo);
    const data = Object.values(conteo);

    if (labels.length === 0) {
      labels.push('Sin datos');
      data.push(0);
    }

    this.chartBarras.data.labels = labels;
    this.chartBarras.data.datasets[0].data = data;
    
    const colors = [
      { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgba(239, 68, 68, 1)' },
      { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgba(249, 115, 22, 1)' },
      { bg: 'rgba(234, 179, 8, 0.8)', border: 'rgba(234, 179, 8, 1)' },
      { bg: 'rgba(139, 92, 246, 0.8)', border: 'rgba(139, 92, 246, 1)' },
      { bg: 'rgba(107, 114, 128, 0.8)', border: 'rgba(107, 114, 128, 1)' }
    ];

    this.chartBarras.data.datasets[0].backgroundColor = labels.map((_: any, i: number) => colors[i % colors.length].bg);
    this.chartBarras.data.datasets[0].borderColor = labels.map((_: any, i: number) => colors[i % colors.length].border);

    this.chartBarras.update();
  }

  abrirModalBarras(): void {
    this.tipoModalActivo = 'barras';
    this.tituloModal = 'Análisis de Reportes';
    this.modalAbierto = true;
    document.body.classList.add('modal-open');
  }

  abrirDetalleInfraccion(infraccion: ReporteAdmin): void {
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
