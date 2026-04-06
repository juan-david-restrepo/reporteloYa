/*=================================================================
  COMPONENTE: DASHBOARD ADMINISTRADOR
  Función: Panel principal del administrador que muestra estadísticas,
  gráficos de reportes y una tabla con todos los reportes/incidentes.
  Permite filtrar por tipo, estado y período de tiempo.
=================================================================*/

/*------------------ IMPORTACIONES ------------------
  Angular Core: Componente y ciclo de vida
  Chart.js: Biblioteca para gráficos
  RouterModule, CommonModule, FormsModule: Funcionalidades de Angular
  Servicios: InfraccionService, WebsocketService
*/
import { Component, AfterViewInit, OnInit, OnDestroy, OnChanges, ChangeDetectorRef, SimpleChanges } from '@angular/core';
import Chart from 'chart.js/auto';
import { SidebarAdmin } from './sidebar-admin/sidebar-admin';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InfraccionService, AdminDashboard } from '../../service/infraccion.service';
import { WebsocketService } from '../../service/websocket.service';


/*------------------ INTERFAZ REPORTEADMIN ------------------
  Define la estructura de un reporte en el dashboard admin
*/
interface ReporteAdmin {
  id: number;
  ref: string;                    // Referencia formateada (ej: INF-001)
  fecha: string;                  // Fecha del incidente
  tipo: string;                  // Tipo de infracción
  tipoInfraccion?: string;       // Tipo de infracción (alternativo)
  agente: string;                // Nombre del agente
  nombreAgente?: string;         // Nombre completo del agente
  placaAgente?: string;          // Placa del agente
  placa?: string;                // Placa del vehículo
  estado: string;                // Estado del reporte
  descripcion?: string;          // Descripción del incidente
  resumen?: string;              // Resumen operativo
  resumenOperativo?: string;     // Resumen operativo (alternativo)
  ubicacion?: string;            // Ubicación del incidente
  direccion?: string;            // Dirección
  prioridad?: string;            // Prioridad
  fechaIncidente?: string;      // Fecha del incidente
  horaIncidente?: string;       // Hora del incidente
  urlFoto?: string;              // URL de la foto
  fechaAceptado?: string;       // Fecha cuando se aceptó
  fechaFinalizado?: string;      // Fecha cuando se finalizó
  fechaRechazado?: string;       // Fecha cuando se rechazó
  acompanado?: boolean;          // Si estaba acompañado
  placaCompanero?: string;       // Placa del compañero
  nombreCompanero?: string;      // Nombre del compañero
}


/*========================================================
  DECORADOR @COMPONENT
=========================================================*/
@Component({
  selector: 'app-admin',                // Etiqueta HTML
  standalone: true,                     // Componente independiente
  templateUrl: './admin.html',         // Plantilla HTML
  styleUrls: ['./admin.css'],           // Estilos CSS
  imports: [SidebarAdmin, RouterModule, CommonModule, FormsModule]
})


/*========================================================
  CLASE PRINCIPAL
  Implementa múltiples interfaces de ciclo de vida
=========================================================*/
export class Admin implements OnInit, AfterViewInit, OnDestroy, OnChanges {

  /*------------------ 1. ESTADO DE LA INTERFAZ ------------------*/
  menuAbierto = false;                  // Control del menú móvil
  modalAbierto = false;                 // Control del modal
  tituloModal = '';                     // Título del modal
  tipoModalActivo: 'barras' | 'infraccion' = 'barras';  // Tipo de modal activo


  /*------------------ 2. DATOS DE REPORTES ------------------*/
  infracciones: ReporteAdmin[] = [];              // Todos los reportes
  infraccionesAMostrar: ReporteAdmin[] = [];       // Reportes filtrados para mostrar
  infraccionSeleccionada: ReporteAdmin | null = null;  // Reporte seleccionado


  /*------------------ 3. FILTROS ------------------*/
  filtroTipoGrafico = 'todos';         // Filtro de tipo en el gráfico
  filtroTiempoGrafico = 'mes';         // Filtro de tiempo en el gráfico
  filtroTablaTipo = '';                // Filtro de tipo en la tabla
  filtroTablaEstado = '';              // Filtro de estado en la tabla
  filtroEstadoModal = '';              // Filtro de estado en el modal


  /*------------------ 4. DASHBOARD Y GRÁFICOS ------------------*/
  dashboard: AdminDashboard | null = null;
  chartBarras: any;                    // Instancia del gráfico de barras
  cargando = true;                     // Indicador de carga
  errorCarga = '';                     // Mensaje de error
  debugInfo = '';                      // Info de depuración


  /*------------------ 5. CONSTRUCTOR ------------------*/
  constructor(
    private infraccionService: InfraccionService,   // Servicio de infracciones
    private websocketService: WebsocketService,      // Servicio de tiempo real
    private cdr: ChangeDetectorRef                  // Para forzar detección de cambios
  ) {}


  /*------------------ 6. CARGA DE CONFIGURACIÓN ------------------*/
  private loadSettings(): void {
    // Carga modo oscuro
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');

    // Carga tamaño de fuente
    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
      document.body.style.setProperty('--admin-font-size', savedSize + 'px');
    }
  }


  /*------------------ 7. ngOnInit - INICIALIZACIÓN ------------------*/
  ngOnInit(): void {
    // Carga configuraciones
    this.loadSettings();
    
    // Carga los reportes iniciales
    this.cargarInfracciones();
    
    // Conecta al WebSocket para recibir reportes en tiempo real
    this.websocketService.connect('admin');
    
    // Suscripción a nuevos reportes
    this.websocketService.reportes$.subscribe((reporte: any) => {
      this.cargarInfracciones();
      this.cdr.detectChanges();
    });
    
    // Intenta inicializar el gráfico después de un delay
    setTimeout(() => {
      if (this.infracciones.length > 0) {
        this.inicializarGrafico();
      }
    }, 800);
  }


  /*------------------ 8. refreshData - RECARGAR DATOS ------------------*/
  refreshData(): void {
    this.cargarInfracciones();
  }


  /*------------------ 9. ngAfterViewInit - DESPUÉS DE RENDERIZAR ------------------*/
  ngAfterViewInit(): void {
    this.cdr.detectChanges();
    
    // Función para inicializar el gráfico
    const initChart = () => {
      const canvas = document.getElementById('barChart') as HTMLCanvasElement;
      if (canvas) {
        if (!this.chartBarras) {
          this.inicializarGrafico();
        } else {
          this.chartBarras.resize();
          this.actualizarGraficoBarras();
        }
      }
    };
    
    // Múltiples intentos para asegurar que el canvas esté listo
    setTimeout(initChart, 300);
    setTimeout(initChart, 600);
    setTimeout(initChart, 1000);
    
    // Re-inicializa el gráfico cuando la pestaña vuelve a estar visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.chartBarras) {
        setTimeout(() => {
          this.chartBarras?.resize();
          this.actualizarGraficoBarras();
        }, 200);
      }
    });
  }


  /*------------------ 10. ngOnChanges - CUANDO CAMBIAN PROPIEDADES ------------------*/
  ngOnChanges(): void {
    setTimeout(() => {
      if (this.chartBarras) {
        this.chartBarras.resize();
        this.actualizarGraficoBarras();
      } else {
        this.inicializarGrafico();
      }
    }, 100);
  }


  /*------------------ 11. forceChartUpdate - FORZAR ACTUALIZACIÓN GRÁFICO ------------------*/
  forceChartUpdate(): void {
    if (this.chartBarras) {
      this.chartBarras.resize();
      this.actualizarGraficoBarras();
    } else {
      this.inicializarGrafico();
    }
  }


  /*------------------ 12. ngOnDestroy - LIMPIEZA ------------------*/
  ngOnDestroy(): void {
    // Destruye el gráfico para liberar memoria
    if (this.chartBarras) {
      this.chartBarras.destroy();
    }
    // Desconecta el WebSocket
    this.websocketService.disconnect();
  }


  /*------------------ 13. CARGA DE DATOS ------------------*/
  
  // Carga las infracciones/reportes desde el servidor
  private cargarInfracciones(): void {
    this.cargando = true;
    this.errorCarga = '';
    this.debugInfo = 'Cargando...';

    // Obtiene las infracciones
    this.infraccionService.getInfraccionesSimple().subscribe({
      next: (response: any) => {
        
        let items: any[] = [];
        
        // Maneja diferentes formatos de respuesta
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
        
        // Transforma cada item al formato ReporteAdmin
        this.infracciones = items.map((item: any) => this.transformarReporte(item));
        this.infraccionesAMostrar = [...this.infracciones];
        this.cargando = false;
        
        this.debugInfo = `Cargados: ${this.infracciones.length}`;
        
        this.cdr.detectChanges();
        
        // Inicializa o actualiza el gráfico
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

    // Obtiene estadísticas del dashboard
    this.infraccionService.getEstadisticasAdmin().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error estadísticas:', err);
      }
    });
  }


  /*------------------ 14. GRÁFICOS (CHART.JS) ------------------*/
  
  // Inicializa el gráfico de barras
  private inicializarGrafico(): void {
    const canvas = document.getElementById('barChart') as HTMLCanvasElement;
    if (!canvas) {
      setTimeout(() => this.inicializarGrafico(), 200);
      return;
    }

    // Destruye el gráfico anterior si existe
    if (this.chartBarras) {
      this.chartBarras.destroy();
      this.chartBarras = null;
    }

    try {
      // Crea el gráfico con configuración inicial
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
    } catch (error) {
    }
  }


  /*------------------ 15. TRANSFORMACIÓN DE DATOS ------------------*/
  
  // Transforma los datos del servidor al formato ReporteAdmin
  private transformarReporte(data: any): ReporteAdmin {
    // Extrae la URL de la foto
    let urlFoto = '';
    if (data.evidencias && data.evidencias.length > 0) {
      urlFoto = data.evidencias[0].archivo || '';
    }

    // Extrae información del agente
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

    // Extrae información del compañero
    let placaCompanero = '';
    let nombreCompanero = '';
    if (data.agenteCompanero) {
      placaCompanero = data.agenteCompanero.placa || '';
      nombreCompanero = data.agenteCompanero.nombreCompleto || data.agenteCompanero.nombre || '';
    } else if (data.placaCompanero) {
      placaCompanero = data.placaCompanero;
    }

    // Retorna el objeto transformado
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

  // Extrae la fecha de varias posibles fuentes
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

  // Normaliza el estado a un formato estándar
  private normalizarEstado(estado: any): string {
    if (!estado) return 'PENDIENTE';
    const estadoStr = String(estado).toUpperCase();
    if (estadoStr === 'PENDIENTE') return 'PENDIENTE';
    if (estadoStr === 'EN_PROCESO' || estadoStr === 'EN PROCESO') return 'EN PROCESO';
    if (estadoStr === 'FINALIZADO') return 'FINALIZADO';
    if (estadoStr === 'RECHAZADO') return 'RECHAZADO';
    return 'PENDIENTE';
  }


  /*------------------ 16. FILTROS DE LA TABLA ------------------*/
  
  // Filtra la tabla por tipo de infracción
  filtrarTablaPorTipo(event: Event): void {
    this.filtroTablaTipo = (event.target as HTMLSelectElement).value;
    this.aplicarFiltrosTabla();
  }

  // Filtra la tabla por estado
  aplicarFiltro(event: Event): void {
    this.filtroTablaEstado = (event.target as HTMLSelectElement).value;
    this.aplicarFiltrosTabla();
  }

  // Aplica ambos filtros a la tabla
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


  /*------------------ 17. FUNCIONES UTILITARIAS ------------------*/
  
  // Retorna la clase CSS según el estado
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

  // Retorna el nombre legible del tipo de infracción
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

  // Retorna la cantidad de reportes por estado
  getCountByEstado(estado: string): number {
    return this.infraccionesAMostrar.filter(inf => inf.estado === estado).length;
  }


  /*------------------ 18. FILTROS DEL MODAL ------------------*/
  
  // Filtra los reportes mostrados en el modal por estado
  filtrarPorEstadoModal(estado: string): void {
    this.filtroEstadoModal = this.filtroEstadoModal === estado ? '' : estado;
  }

  // Getter: retorna los reportes filtrados según el filtro de estado
  get reportesFiltrados(): ReporteAdmin[] {
    if (!this.filtroEstadoModal) {
      return this.infraccionesAMostrar;
    }
    return this.infraccionesAMostrar.filter(inf => inf.estado === this.filtroEstadoModal);
  }

  // Verifica si un estado está activo para el filtro
  isEstadoActivo(estado: string): boolean {
    return this.filtroEstadoModal === estado;
  }


  /*------------------ 19. FILTROS DEL GRÁFICO ------------------*/
  
  // Filtra el gráfico por período de tiempo
  filtrarPorTiempo(event: Event): void {
    this.filtroTiempoGrafico = (event.target as HTMLSelectElement).value;
    this.actualizarGraficoBarras();
  }

  // Filtra el gráfico por tipo de infracción
  filtrarPorTipo(event: Event): void {
    this.filtroTipoGrafico = (event.target as HTMLSelectElement).value;
    this.actualizarGraficoBarras();
  }

  // Actualiza los datos del gráfico según los filtros aplicados
  private actualizarGraficoBarras(): void {
    if (!this.chartBarras) {
      this.inicializarGrafico();
      return;
    }

    const ahora = new Date();
    
    // Filtra los datos por tiempo y tipo
    const datosFiltrados = this.infracciones.filter(inf => {
      if (!inf.fecha) return false;
      
      let fechaInf: Date;
      const fechaStr = inf.fecha.toString();
      
      // Parsea la fecha
      if (fechaStr.includes('T')) {
        fechaInf = new Date(fechaStr);
      } else {
        fechaInf = new Date(fechaStr + 'T00:00:00');
      }
      
      if (isNaN(fechaInf.getTime())) return false;
      
      const año = fechaInf.getFullYear();
      const mes = fechaInf.getMonth();
      const dia = fechaInf.getDate();
      
      const añoActual = ahora.getFullYear();
      const mesActual = ahora.getMonth();
      const diaActual = ahora.getDate();
      
      // Aplica filtro de tiempo
      let cumpleTiempo = true;
      if (!this.filtroTiempoGrafico || this.filtroTiempoGrafico === 'anio') {
        cumpleTiempo = año === añoActual;
      } else if (this.filtroTiempoGrafico === 'hoy') {
        cumpleTiempo = año === añoActual && mes === mesActual && dia === diaActual;
      } else if (this.filtroTiempoGrafico === 'semana') {
        const haceUnaSemana = new Date(añoActual, mesActual, diaActual - 7);
        const fechaComparable = new Date(año, mes, dia);
        cumpleTiempo = fechaComparable >= haceUnaSemana;
      } else if (this.filtroTiempoGrafico === 'mes') {
        cumpleTiempo = mes === mesActual && año === añoActual;
      }

      // Aplica filtro de tipo
      const cumpleTipo = this.filtroTipoGrafico === 'todos' || this.getNombreTipo(inf.tipo) === this.filtroTipoGrafico;

      return cumpleTiempo && cumpleTipo;
    });

    // Cuenta los reportes por tipo
    const conteo: Record<string, number> = {};
    datosFiltrados.forEach(inf => {
      const tipoNormalizado = this.getNombreTipo(inf.tipo);
      conteo[tipoNormalizado] = (conteo[tipoNormalizado] || 0) + 1;
    });

    // Mapea los labels a nombres más cortos
    const labelsMap: Record<string, string> = {
      'Accidente de tránsito': 'Accidente',
      'Vehículo mal estacionado': 'Mal Estacionado',
      'Semáforo dañado': 'Semáforo Dañado',
      'Conducción peligrosa': 'Conducción Peligrosa',
      'Otros': 'Otros'
    };

    const labels = Object.keys(conteo).map(tipo => labelsMap[tipo] || tipo);
    const data = Object.values(conteo);

    // Si no hay datos, muestra mensaje
    if (labels.length === 0) {
      labels.push('Sin datos');
      data.push(0);
    }

    // Actualiza los datos del gráfico
    this.chartBarras.data.labels = labels;
    this.chartBarras.data.datasets[0].data = data;
    
    // Colores para las barras
    const colors = [
      { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgba(239, 68, 68, 1)' },
      { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgba(249, 115, 22, 1)' },
      { bg: 'rgba(234, 179, 8, 0.8)', border: 'rgba(234, 179, 8, 1)' },
      { bg: 'rgba(139, 92, 246, 0.8)', border: 'rgba(139, 92, 246, 1)' },
      { bg: 'rgba(107, 114, 128, 0.8)', border: 'rgba(107, 114, 128, 1)' }
    ];

    // Aplica los colores
    this.chartBarras.data.datasets[0].backgroundColor = labels.map((_: any, i: number) => colors[i % colors.length].bg);
    this.chartBarras.data.datasets[0].borderColor = labels.map((_: any, i: number) => colors[i % colors.length].border);

    this.chartBarras.update();
  }


  /*------------------ 20. CONTROL DE MODALES ------------------*/
  
  // Abre el modal del gráfico de barras
  abrirModalBarras(): void {
    this.tipoModalActivo = 'barras';
    this.tituloModal = 'Análisis de Reportes';
    this.modalAbierto = true;
    document.body.classList.add('modal-open');
    
    setTimeout(() => {
      if (!this.chartBarras) {
        this.inicializarGrafico();
      } else {
        this.actualizarGraficoBarras();
        this.chartBarras.resize();
      }
    }, 100);
  }

  // Abre el modal de detalle de una infracción
  abrirDetalleInfraccion(infraccion: ReporteAdmin): void {
    this.tipoModalActivo = 'infraccion';
    this.tituloModal = `Detalle de Registro: ${infraccion.ref}`;
    this.infraccionSeleccionada = infraccion;
    this.modalAbierto = true;
    document.body.classList.add('modal-open');
  }

  // Cierra el modal
  cerrarModal(): void {
    this.modalAbierto = false;
    this.infraccionSeleccionada = null;
    document.body.classList.remove('modal-open');
  }
}
