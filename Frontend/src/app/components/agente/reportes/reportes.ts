import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Reporte, EstadoReporte } from '../agente';
import { AgenteServiceTs } from '../../../service/agente.service';
import { trigger, transition, style, animate } from '@angular/animations';


@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(10px)' }))
      ])
    ])
  ]
})
export class Reportes implements OnChanges {

  // ================================================================
  // reportesScroll: lo que SE MUESTRA en pantalla.
  // Se carga con getReportesAgente() (pendientes + en_proceso del agente)
  // y se complementa con scroll paginado para ver más pendientes.
  // ================================================================
  reportesScroll: Reporte[] = [];
  page = 0;
  size = 6;
  loading = false;
  totalPages = 0;
  cargaInicialHecha = false;

  // ================================
  // MODAL ACEPTAR
  // ================================
  mostrarModalAceptar = false;
  modoAceptacion: 'solo' | 'acompanado' | null = null;
  placaBusqueda = '';
  companeroEncontrado: { nombre: string; placa: string; estado: string } | null = null;
  buscandoCompanero = false;
  errorBusqueda: string | null = null;
  reporteTemporal: Reporte | null = null;

  // ================================
  // INPUTS / OUTPUTS
  // ================================
  @Input() hayEnProceso: boolean = false;
  @Input() puedeAccion: boolean = true; // Para deshabilitar botones
  @Input() origen: 'historial' | 'reportes' = 'reportes';
  @Output() volver = new EventEmitter<'historial' | 'reportes'>();
  @Input() modoLectura: boolean = false;
  @Input() reporteInicial: Reporte | null = null;

  // reportes = reportesEntrantes del padre (fuente de verdad para estados)
  @Input() reportes!: Reporte[];
  @Input() historial!: Reporte[];

  @Output() aceptar   = new EventEmitter<Reporte>();
  @Output() rechazar  = new EventEmitter<Reporte>();
  @Output() finalizar = new EventEmitter<Reporte>();

  EstadoReporte = EstadoReporte;

  // ================================
  // ZOOM IMAGEN
  // ================================
  mostrarImagenZoom = false;
  imagenZoomUrl: string | null = null;
  zoomScale = 1;

  // ================================
  // MODALES
  // ================================
  mostrarModal = false;
  mostrarModalResumen = false;
  resumenTexto = '';

  // ================================
  // DETALLE
  // ================================
  reporteSeleccionado: Reporte | null = null;
  mapaUrl: SafeResourceUrl | null = null;

  // ================================
  // FILTROS
  // ================================
  filtroActivo: 'TODOS' | 'BAJA' | 'MEDIA' | 'ALTA' = 'TODOS';

  // ================================
  // ALERTAS
  // ================================
  mensajeAlerta: string | null = null;

  constructor(
    private sanitizer: DomSanitizer,
    private agenteService: AgenteServiceTs
  ) {}

  // ================================
  // LIFECYCLE
  // ================================
  ngOnInit() {
    // Carga inicial: primero los reportes del agente (activos + en proceso)
    // luego complementa con scroll paginado
    this.cargarReportesAgente();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Abrir detalle si viene desde historial
    if (changes['reporteInicial'] && this.reporteInicial) {
      this.seleccionar(this.reporteInicial);
    }

    // Sincronizar estados cuando el padre (agente.ts) actualiza reportesEntrantes
    if (changes['reportes'] && this.reportes) {
      this._sincronizarConPadre();
    }
  }

  // ================================================================
  // CARGA INICIAL: trae los reportes del agente desde el backend
  // (PENDIENTES globales + EN_PROCESO del agente)
  // Esto es lo que sobrevive al cambiar de vista y volver.
  // ================================================================
  cargarReportesAgente() {
    this.loading = true;
    this.agenteService.getReportesAgente().subscribe({
      next: (data: any[]) => {
        this.reportesScroll = data.map((r: any): Reporte => this._mapear(r));
        this.cargaInicialHecha = true;
        this.loading = false;
        // Después de la carga inicial, arrancar el scroll paginado desde página 0
        this.page = 0;
        this.totalPages = 0;
        this.cargarMasReportesPaginados();
      },
      error: (err) => {
        console.error('Error cargando reportes del agente', err);
        this.loading = false;
        this.cargaInicialHecha = true;
      }
    });
  }

  // ================================================================
  // SCROLL PAGINADO: agrega reportes pendientes adicionales al scroll
  // Solo agrega los que NO están ya en la lista (evita duplicados)
  // ================================================================
  cargarMasReportesPaginados() {
    if (this.loading) return;
    if (this.page >= this.totalPages && this.page !== 0) return;

    this.loading = true;

    this.agenteService.getReportes(this.page, this.size, this.filtroActivo).subscribe({
      next: (data) => {
        const content = data?.content;
        const totalPages = data?.totalPages ?? 0;
        if (Array.isArray(content)) {
          this.totalPages = totalPages;
          const nuevos: Reporte[] = content.map((r: any): Reporte => ({
            ...this._mapear(r),
            estado: this._estadoDesdePadre(r.id, (r.estado || 'PENDIENTE').toLowerCase())
          }));
          for (const n of nuevos) {
            if (!this.reportesScroll.some(s => s.id === n.id)) {
              this.reportesScroll.push(n);
            }
          }
        }
        this.page++;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error en scroll paginado', err);
        this.loading = false;
      }
    });
  }

  @HostListener('window:scroll', [])
  onScroll() {
    const scrollTop      = window.scrollY;
    const windowHeight   = window.innerHeight;
    const documentHeight = document.body.offsetHeight;
    if (scrollTop + windowHeight >= documentHeight - 200) {
      this.cargarMasReportesPaginados();
    }
  }

  cambiarFiltro(filtro: 'TODOS' | 'BAJA' | 'MEDIA' | 'ALTA') {
    this.filtroActivo = filtro;
    this.page         = 0;
    this.totalPages   = 0;

    if (filtro === 'TODOS') {
      // Solo al volver a TODOS: recargar base desde backend para tener lista completa.
      this.reportesScroll = this.reportesScroll.filter(
        r => r.estado === EstadoReporte.EN_PROCESO
      );
      this.loading = true;
      this.agenteService.getReportesAgente().subscribe({
        next: (data: any[]) => {
          this.reportesScroll = data.map((r: any): Reporte => this._mapear(r));
          this.loading = false;
          this.cargarMasReportesPaginados();
        },
        error: (err) => {
          console.error('Error cargando reportes del agente', err);
          this.loading = false;
        }
      });
    } else {
      // BAJA / MEDIA / ALTA: no vaciar la lista; solo cambiar el filtro.
      // reportesFiltrados (getter) filtra por etiqueta en la lista ya cargada.
    }
  }

  // ================================================================
  // SINCRONIZAR reportesScroll con reportesEntrantes del padre
  // Se llama cada vez que el padre cambia su array (ngOnChanges).
  // ================================================================
  private _sincronizarConPadre() {
    if (!this.reportes) return;

    const mapaPadre = new Map<number, Reporte>(
      this.reportes.map(r => [r.id, r])
    );

    // 1. Actualizar estados de los que ya están en pantalla
    for (let i = 0; i < this.reportesScroll.length; i++) {
      const enPadre = mapaPadre.get(this.reportesScroll[i].id);
      if (enPadre && enPadre.estado !== this.reportesScroll[i].estado) {
        this.reportesScroll[i] = { ...this.reportesScroll[i], ...enPadre };
      }
    }

    // 2. Agregar al inicio los que el padre tiene pero el scroll no
    //    (ej: reporte asignado como compañero llega por WS → padre lo agrega)
    for (const r of this.reportes) {
      if (!this.reportesScroll.some(s => s.id === r.id)) {
        this.reportesScroll.unshift(r);
      }
    }

    // 3. Quitar del scroll los PENDIENTES que el padre ya eliminó
    //    (los tomó otro agente). Los EN_PROCESO se quedan siempre.
    const idsDelPadre = new Set(this.reportes.map(r => r.id));
    this.reportesScroll = this.reportesScroll.filter(r => {
      if (r.estado === EstadoReporte.PENDIENTE && !idsDelPadre.has(r.id)) return false;
      return true;
    });

    // 4. Actualizar objeto seleccionado si está abierto
    if (this.reporteSeleccionado) {
      const act = this.reportesScroll.find(r => r.id === this.reporteSeleccionado!.id);
      if (act) this.reporteSeleccionado = act;
    }
  }

  private _estadoDesdePadre(id: number, estadoBackend: string): EstadoReporte {
    if (this.reportes) {
      const enPadre = this.reportes.find(r => r.id === id);
      if (enPadre?.estado) return enPadre.estado;
    }
    return (estadoBackend || 'pendiente') as EstadoReporte;
  }

  private _mapear(r: any): Reporte {
    const prioridadRaw = r.prioridad;
    const etiqueta = typeof prioridadRaw === 'string'
      ? prioridadRaw
      : (prioridadRaw && typeof prioridadRaw === 'object' && (prioridadRaw as any).name)
        ? (prioridadRaw as any).name
        : prioridadRaw ?? '';
    return {
      id:               r.id,
      tipoInfraccion:   r.tipoInfraccion,
      direccion:        r.direccion,
      horaIncidente:    r.horaIncidente ?? '',
      fechaIncidente:   r.fechaIncidente  ? new Date(r.fechaIncidente)  : new Date(),
      descripcion:      r.descripcion,
      foto:             r.urlFoto || '',
      latitud:          r.latitud,
      longitud:         r.longitud,
      lat:              r.latitud,
      lng:              r.longitud,
      etiqueta:         etiqueta,
      estado:           ((r.estado || 'PENDIENTE') as string).toLowerCase() as EstadoReporte,
      fechaAceptado:    r.fechaAceptado    ? new Date(r.fechaAceptado)    : undefined,
      fechaFinalizado:  r.fechaFinalizado  ? new Date(r.fechaFinalizado)  : undefined,
      fechaRechazado:   r.fechaRechazado   ? new Date(r.fechaRechazado)   : undefined,
      resumenOperativo: r.resumenOperativo,
      acompanado:       r.acompanado ?? false,
      placaCompanero:   r.placaCompanero,
      nombreCompanero:  r.nombreCompanero
    };
  }

  // ================================
  // DETALLE
  // ================================
  seleccionar(r: Reporte) {
    this.reporteSeleccionado = r;
    if (r.lat && r.lng) {
      const url = `https://www.google.com/maps?q=${r.lat},${r.lng}&hl=es&z=16&output=embed`;
      this.mapaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } else {
      this.mapaUrl = null;
    }
  }

  volverClick() {
    if (this.origen === 'historial') this.volver.emit('historial');
    else this.reporteSeleccionado = null;
  }

  // ================================
  // ACEPTAR — actualización optimista
  // ================================
  aceptarClick(r: Reporte) {
    if (this.hayEnProceso) { this.mostrarAlerta('Ya tienes un reporte en proceso'); return; }
    this.reporteTemporal     = r;
    this.mostrarModalAceptar = true;
  }

  buscarCompanero() {
    const placa = this.placaBusqueda.trim();
    if (!placa) { this.mostrarAlerta('Ingresa una placa'); return; }

    this.buscandoCompanero   = true;
    this.errorBusqueda       = null;
    this.companeroEncontrado = null;

    this.agenteService.buscarAgenteDisponible(placa).subscribe({
      next: (agente) => {
        this.buscandoCompanero = false;
        if (agente.estado !== 'LIBRE') {
          this.errorBusqueda = `${agente.nombre} no está disponible (${agente.estado})`;
        } else {
          this.companeroEncontrado = agente;
        }
      },
      error: (err) => {
        this.buscandoCompanero = false;
        this.errorBusqueda     = err?.error || 'No se encontró agente con esa placa';
      }
    });
  }

  confirmarAceptar() {
    if (!this.reporteTemporal)   return;
    if (!this.modoAceptacion) { this.mostrarAlerta('Selecciona una opción'); return; }
    if (this.modoAceptacion === 'acompanado' && !this.companeroEncontrado) {
      this.mostrarAlerta('Debes seleccionar un compañero disponible'); return;
    }

    const reporte      = this.reporteTemporal;
    reporte.acompanado = this.modoAceptacion === 'acompanado';

    if (reporte.acompanado && this.companeroEncontrado) {
      reporte.placaCompanero  = this.companeroEncontrado.placa;
      reporte.nombreCompanero = this.companeroEncontrado.nombre;
    }

    this.aceptar.emit(reporte);

    // Actualización optimista en reportesScroll
    const idx = this.reportesScroll.findIndex(x => x.id === reporte.id);
    if (idx !== -1) {
      this.reportesScroll[idx] = {
        ...this.reportesScroll[idx],
        estado:          EstadoReporte.EN_PROCESO,
        fechaAceptado:   new Date(),
        acompanado:      reporte.acompanado,
        placaCompanero:  reporte.placaCompanero,
        nombreCompanero: reporte.nombreCompanero
      };
      if (this.reporteSeleccionado?.id === reporte.id) {
        this.reporteSeleccionado = this.reportesScroll[idx];
      }
    }

    this.cerrarModalAceptar();
  }

  cerrarModalAceptar() {
    this.mostrarModalAceptar = false;
    this.modoAceptacion      = null;
    this.placaBusqueda       = '';
    this.companeroEncontrado = null;
    this.errorBusqueda       = null;
    this.buscandoCompanero   = false;
    this.reporteTemporal     = null;
  }

  // ================================
  // RECHAZAR
  // ================================
  rechazarClick(r: Reporte) {
    if (this.hayEnProceso) { this.mostrarAlerta('No puedes rechazar mientras tienes uno en proceso'); return; }
    this.reportesScroll      = this.reportesScroll.filter(x => x.id !== r.id);
    this.reporteSeleccionado = null;
    this.rechazar.emit(r);
  }

  // ================================
  // FINALIZAR — actualización optimista
  // ================================
  abrirModalFinalizar() { this.mostrarModal = true; }

  confirmarFinalizar() {
    if (!this.reporteSeleccionado) return;
    if (!this.resumenTexto || this.resumenTexto.trim().length < 10) {
      this.mostrarAlerta('Debes escribir un resumen mínimo de 10 caracteres'); return;
    }

    const idx = this.reportesScroll.findIndex(x => x.id === this.reporteSeleccionado!.id);
    if (idx !== -1) {
      this.reportesScroll[idx] = {
        ...this.reportesScroll[idx],
        estado:           EstadoReporte.FINALIZADO,
        fechaFinalizado:  new Date(),
        resumenOperativo: this.resumenTexto.trim()
      };
      this.reporteSeleccionado = this.reportesScroll[idx];
    } else {
      this.reporteSeleccionado.estado           = EstadoReporte.FINALIZADO;
      this.reporteSeleccionado.fechaFinalizado  = new Date();
      this.reporteSeleccionado.resumenOperativo = this.resumenTexto.trim();
    }

    this.finalizar.emit(this.reporteSeleccionado);
    this.mostrarModal        = false;
    this.resumenTexto        = '';
    this.reporteSeleccionado = null;
  }

  abrirModalResumen() { this.mostrarModalResumen = true; }

  // ================================
  // GETTERS
  // ================================
  get reportesFiltrados() {
    const lista = [...this.reportesScroll].sort((a, b) => {
      if (a.estado === EstadoReporte.EN_PROCESO) return -1;
      if (b.estado === EstadoReporte.EN_PROCESO) return  1;
      return 0;
    });
    if (this.filtroActivo === 'TODOS') return lista;
    const filtro = this.filtroActivo;
    return lista.filter(r => {
      const etq = (r.etiqueta ?? '').toString().toUpperCase();
      return etq === filtro;
    });
  }

  getClasePrioridad(etiqueta: string) {
    switch (etiqueta?.toLowerCase()) {
      case 'alta':  return 'prioridad-alta';
      case 'media': return 'prioridad-media';
      case 'baja':  return 'prioridad-baja';
      default:      return '';
    }
  }

  getMapaUrl(r: Reporte): SafeResourceUrl {
    if (!r.lat || !r.lng) return '';
    const url = `https://www.google.com/maps?q=${r.lat},${r.lng}&hl=es&z=16&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getDuracion(r: Reporte) {
    if (!r.fechaAceptado || !r.fechaFinalizado) return '';
    const diff    = r.fechaFinalizado.getTime() - r.fechaAceptado.getTime();
    const horas   = Math.floor(diff / 3600000);
    const minutos = Math.floor((diff % 3600000) / 60000);
    return horas > 0 ? `${horas}h ${minutos}min` : `${minutos} minutos`;
  }

  mostrarAlerta(msg: string) {
    this.mensajeAlerta = msg;
    setTimeout(() => { this.mensajeAlerta = null; }, 3000);
  }

  abrirZoom(url: string) { this.imagenZoomUrl = url; this.mostrarImagenZoom = true; }
  cerrarZoom() { this.mostrarImagenZoom = false; this.imagenZoomUrl = null; this.zoomScale = 1; }

  zoomConRueda(event: WheelEvent) {
    event.preventDefault();
    this.zoomScale += event.deltaY < 0 ? 0.1 : -0.1;
    if (this.zoomScale < 1) this.zoomScale = 1;
    if (this.zoomScale > 3) this.zoomScale = 3;
  }
}
