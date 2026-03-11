import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarAgente } from './sidebar-agente/sidebar-agente';
import { Configuracion } from './configuracion/configuracion';
import { PerfilAgente } from './perfil-agente/perfil-agente';
import { Historial } from './historial/historial';
import { Reportes } from './reportes/reportes';
import { Dashboard } from './dashboard/dashboard';
import { Tareas } from './tareas/tareas';
import { AgenteServiceTs } from '../../service/agente.service';
import { OnInit, OnDestroy } from '@angular/core';
import { WebsocketService } from '../../service/websocket.service';
import { Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';


export enum EstadoReporte {
  PENDIENTE  = 'pendiente',
  EN_PROCESO = 'en_proceso',
  RECHAZADO  = 'rechazado',
  FINALIZADO = 'finalizado'
}

export interface Reporte {
  id: number;
  tipoInfraccion: string;
  direccion: string;
  horaIncidente: string;
  fechaIncidente: Date;
  descripcion: string;
  foto: string;
  latitud: number;
  longitud: number;
  etiqueta: string;
  lat?: number;
  lng?: number;
  estado?: EstadoReporte;
  fechaAceptado?: Date;
  fechaFinalizado?: Date;
  resumenOperativo?: string;
  fechaRechazado?: Date;
  acompanado?: boolean;
  placaCompanero?: string;
  nombreCompanero?: string;
  esCompanero?: boolean;
}

export interface Tarea {
  id: number;
  titulo: string;
  admin: string;
  descripcion: string;
  estado: 'PENDIENTE' | 'EN PROCESO' | 'FINALIZADO' | 'RECHAZADO';
  hora: string;
  fecha: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA';
  fechaInicio?: Date;
  fechaFin?: Date;
  resumen?: string;
}

export interface Notificacion {
  tipo: 'REPORTE' | 'TAREA';
  texto: string;
  hora: string;
  data?: any;
}

type VistaAgente =
  | 'dashboard' | 'reportes' | 'tareas'
  | 'historial' | 'perfil'   | 'configuracion';

@Component({
  selector: 'app-agente',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    SidebarAgente, Dashboard, Reportes,
    Historial, Tareas, PerfilAgente, Configuracion
  ],
  templateUrl: 'agente.html',
  styleUrls: ['agente.css']
})
export class Agente implements OnInit, OnDestroy {

  EstadoReporte = EstadoReporte;
  reporteDesdeHistorial: Reporte | null = null;
  origenDetalle: 'historial' | 'reportes' = 'reportes';

  vistaActual: VistaAgente = 'dashboard';
  estadoAgente: 'LIBRE' | 'OCUPADO' | 'FUERA_SERVICIO' = 'LIBRE';

  config = { modoNoche: false, daltonismo: false, fontSize: 16 };

  mostrarNotificaciones = false;

  // ==================================================================
  // historialReportes: se carga SIEMPRE desde la BD.
  // NUNCA se agrega manualmente aquí para evitar duplicados.
  // ==================================================================
  historialReportes: Reporte[] = [];

  // ==================================================================
  // reportesEntrantes: fuente de verdad para hayEnProceso.
  // reportes.ts lo recibe como @Input() para sincronizar estados.
  // ==================================================================
  reportesEntrantes: Reporte[] = [];

  tareasAdmin: Tarea[] = [];
  notificaciones: Notificacion[] = [];

  perfilAgente: {
    nombre: string; placa: string; documento: string;
    telefono: string; correo: string; foto: string;
  } = {
    nombre: '', placa: '', documento: '',
    telefono: '', correo: '', foto: ''
  };

  constructor(
    private agenteService: AgenteServiceTs,
    private websocketService: WebsocketService,
    private authService: AuthService,
    private router: Router
  ) {}

  // ================================
  // TAREAS
  // ================================
  comenzarTarea(t: Tarea) {
    if (this.tareasAdmin.some(x => x.estado === 'EN PROCESO')) return;
    this.agenteService.actualizarEstadoTarea(t.id, 'EN PROCESO').subscribe(() => {
      t.estado = 'EN PROCESO';
      t.fechaInicio = new Date();
      this.estadoAgente = 'OCUPADO';
      this.agenteService.actualizarEstado('OCUPADO').subscribe();
    });
  }

  finalizarTarea(t: Tarea) {
    this.agenteService.actualizarEstadoTarea(t.id, 'FINALIZADO').subscribe(() => {
      t.estado = 'FINALIZADO';
      t.fechaFin = new Date();
      this.estadoAgente = 'LIBRE';
      this.agenteService.actualizarEstado('LIBRE').subscribe();
    });
  }

  // ================================
  // ACEPTAR REPORTE
  // El hijo ya actualizó su reportesScroll (optimista).
  // Aquí solo hacemos el HTTP y actualizamos reportesEntrantes.
  // ================================
  aceptarReporte(r: Reporte) {
    if (this.hayEnProceso) return;

    const call = (r.acompanado && r.placaCompanero)
      ? this.agenteService.tomarReporteAcompanado(r.id, r.placaCompanero)
      : this.agenteService.tomarReporte(r.id);

    call.subscribe({
      next: (respuesta: any) => {
        const idx = this.reportesEntrantes.findIndex(x => x.id === r.id);
        const actualizado: Reporte = {
          ...(idx !== -1 ? this.reportesEntrantes[idx] : r),
          estado:          EstadoReporte.EN_PROCESO,
          fechaAceptado:   respuesta.fechaAceptado ? new Date(respuesta.fechaAceptado) : new Date(),
          acompanado:      respuesta.acompanado      ?? r.acompanado,
          placaCompanero:  respuesta.placaCompanero  ?? r.placaCompanero,
          nombreCompanero: respuesta.nombreCompanero ?? r.nombreCompanero,
        };
        if (idx !== -1) this.reportesEntrantes[idx] = actualizado;
        else            this.reportesEntrantes.push(actualizado);
        this.estadoAgente = 'OCUPADO';
      },
      error: (err) => {
        console.error('Error aceptando reporte', err);
        // El hijo lo puso EN_PROCESO optimistamente pero el backend rechazó
        // Recargar para dejar la lista limpia
        this.cargarReportesDesdeBD();
      }
    });
  }

  // ================================
  // RECHAZAR REPORTE
  // Solo actualizamos reportesEntrantes.
  // El historial (incluido rechazados) se recarga desde BD al entrar a esa vista.
  // ================================
  rechazarReporte(r: Reporte) {
    if (r.estado === EstadoReporte.RECHAZADO) return;
    // Optimista: quitarlo de la lista visible
    this.reportesEntrantes = this.reportesEntrantes.filter(x => x.id !== r.id);
    this.reporteDesdeHistorial = null;

    this.agenteService.rechazarReporte(r.id).subscribe({
      next: () => {
        // Recargar historial desde BD para incluir el RECHAZADO
        this.cargarHistorialDesdeBD();
      },
      error: (err) => {
        console.error('Error rechazando reporte', err);
        // Si el backend falla, recargar para dejar todo consistente
        this.cargarReportesDesdeBD();
        this.cargarHistorialDesdeBD();
      }
    });
  }

  // ================================
  // FINALIZAR REPORTE
  // El hijo ya actualizó reportesScroll (optimista).
  // Aquí hacemos el HTTP y recargamos historial desde BD.
  // ================================
  finalizarReporte(r: Reporte) {
    this.agenteService.finalizarReporte(r.id, r.resumenOperativo || '').subscribe({
      next: () => {
        // Quitar de reportesEntrantes
        this.reportesEntrantes = this.reportesEntrantes.filter(x => x.id !== r.id);
        this.estadoAgente = 'LIBRE';

        // ===========================================================
        // Recargar historial desde BD para tener datos 100% correctos
        // y sin riesgo de duplicados.
        // ===========================================================
        this.cargarHistorialDesdeBD();
      },
      error: () => {
        console.error('Error finalizando reporte');
        this.cargarReportesDesdeBD();
      }
    });
  }

  // ================================
  // CARGAR REPORTES ACTIVOS DESDE BD
  // ================================
  cargarReportesDesdeBD() {
    this.agenteService.getReportesAgente().subscribe({
      next: (data: any[]) => {
        this.reportesEntrantes = data.map(r => this._mapearReporte(r));
        // Sincronizar estado del agente
        const enProceso = this.reportesEntrantes.some(
          r => r.estado === EstadoReporte.EN_PROCESO
        );
        if (enProceso) this.estadoAgente = 'OCUPADO';
      },
      error: (err) => {
        if (err.status === 401) this.router.navigate(['/login']);
        console.error('Error cargando reportes', err);
      }
    });
  }

  // ================================
  // CARGAR HISTORIAL DESDE BD
  // Esta es la ÚNICA forma en que historialReportes se puebla.
  // ================================
  cargarHistorialDesdeBD() {
    this.agenteService.getHistorialAgente().subscribe({
      next: (data: any[]) => {
        this.historialReportes = data.map(r => this._mapearReporte(r));
      },
      error: (err) => {
        if (err.status === 401) this.router.navigate(['/login']);
        console.error('Error cargando historial', err);
      }
    });
  }

  // ================================
  // CARGAR PERFIL DESDE BD
  // Se llama al entrar a la vista perfil para asegurar que siempre haya datos.
  // ================================
  cargarPerfilDesdeBD() {
    this.agenteService.getPerfil().subscribe({
      next: (data) => {
        this.perfilAgente = {
          nombre:    data.nombreCompleto ?? '',
          documento: data.numeroDocumento ?? '',
          correo:    data.email ?? '',
          placa:     data.placa ?? 'N/A',
          telefono:  data.telefono ?? 'N/A',
          foto:      'https://randomuser.me/api/portraits/men/32.jpg'
        };
        this.estadoAgente = data.estado || 'LIBRE';
      },
      error: (err) => {
        if (err.status === 401) this.router.navigate(['/login']);
        console.error('Error cargando perfil', err);
      }
    });
  }

  // ================================
  // MAPEO BACKEND → Reporte
  // ================================
  _mapearReporte(r: any): Reporte {
    return {
      id:               r.id,
      tipoInfraccion:   r.tipoInfraccion,
      direccion:        r.direccion,
      horaIncidente:    r.horaIncidente   ?? '',
      fechaIncidente:   r.fechaIncidente  ? new Date(r.fechaIncidente)  : new Date(),
      descripcion:      r.descripcion,
      foto:             r.urlFoto || '',
      latitud:          r.latitud,
      longitud:         r.longitud,
      lat:              r.latitud,
      lng:              r.longitud,
      etiqueta:         r.prioridad,
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
  // WEBSOCKET — cambios de estado
  // ================================
  private _manejarReporteWebSocket(rb: any) {
    const nuevo = this._mapearReporte(rb);
    const idx   = this.reportesEntrantes.findIndex(r => r.id === nuevo.id);

    switch (nuevo.estado) {

      case EstadoReporte.FINALIZADO:
        // Finalizado desde otro dispositivo (el compañero lo finalizó)
        if (idx !== -1) {
          this.reportesEntrantes.splice(idx, 1);
          this.estadoAgente = 'LIBRE';
          // Recargar historial para incluir el nuevo reporte finalizado
          this.cargarHistorialDesdeBD();
        }
        break;

      case EstadoReporte.EN_PROCESO:
        // Lo tomó otro agente — quitar de la lista de pendientes
        if (idx !== -1 && this.reportesEntrantes[idx].estado !== EstadoReporte.EN_PROCESO) {
          this.reportesEntrantes.splice(idx, 1);
        }
        break;

      case EstadoReporte.PENDIENTE:
        // Reporte nuevo
        if (idx === -1) {
          this.reportesEntrantes.unshift(nuevo);
          this.notificaciones.unshift({
            tipo:  'REPORTE',
            texto: `Nuevo reporte en ${nuevo.direccion}`,
            hora:  new Date().toLocaleTimeString(),
            data:  nuevo
          });
        }
        break;
    }
  }

  // ================================
  // COMPUTED
  // ================================
  get hayEnProceso(): boolean {
    return this.reportesEntrantes.some(r => r.estado === EstadoReporte.EN_PROCESO);
  }

  // ================================
  // VISTAS
  // ================================
  toggleServicio(nuevoEstado: 'LIBRE' | 'FUERA_SERVICIO') {
    this.estadoAgente = nuevoEstado;
    this.agenteService.actualizarEstado(nuevoEstado).subscribe();
  }

  verDetalleHist(r: Reporte) {
    this.origenDetalle         = 'historial';
    this.reporteDesdeHistorial = r;
    this.vistaActual           = 'reportes';
  }

  cambiarVista(v: VistaAgente) {
    this.vistaActual           = v;
    this.reporteDesdeHistorial = null;
    this.origenDetalle         = 'reportes';
    if (v === 'historial') this.cargarHistorialDesdeBD();
    if (v === 'perfil') this.cargarPerfilDesdeBD();
  }

  volverDesdeDetalle(origen: 'historial' | 'reportes') {
    this.reporteDesdeHistorial = null;
    this.vistaActual           = origen;
  }

  toggleNotificaciones() { this.mostrarNotificaciones = !this.mostrarNotificaciones; }

  abrirNotif(n: any) {
    if (n.tipo === 'REPORTE') this.vistaActual = 'reportes';
    if (n.tipo === 'TAREA')   this.vistaActual = 'tareas';
    this.mostrarNotificaciones = false;
  }

  updateConfig(config: any) {
    document.body.classList.toggle('dark-mode', config.modoNoche);
    document.documentElement.style.setProperty('--font-size-base', config.fontSize + 'px');
  }

  sidebarAbierto = false;
  toggleSidebar() { this.sidebarAbierto = !this.sidebarAbierto; }
  cerrarSidebar()  { this.sidebarAbierto = false; }

  cerrarSesion() {
    this.authService.logout().subscribe({
      next:  () => { this.websocketService.disconnect(); this.router.navigate(['/login']); },
      error: () => { this.router.navigate(['/login']); }
    });
  }

  // ================================
  // INIT
  // ================================
  ngOnInit() {

    // 1. Perfil → WebSocket → Tareas
    this.agenteService.getPerfil().subscribe({
      next: (data) => {
        this.perfilAgente = {
          nombre:    data.nombreCompleto,
          documento: data.numeroDocumento,
          correo:    data.email,
          placa:     data.placa || 'N/A',
          telefono:  data.telefono || 'N/A',
          foto:      'https://randomuser.me/api/portraits/men/32.jpg'
        };
        this.estadoAgente = data.estado || 'LIBRE';
        if (data.placa) this.websocketService.connect(data.placa);

        this.agenteService.getTareasAgente().subscribe({
          next: (tareas: any[]) => {
            this.tareasAdmin = tareas.map(t => ({
              id: t.id, titulo: t.titulo, descripcion: t.descripcion,
              admin: 'Administrador', estado: t.estado,
              hora: t.hora, fecha: t.fecha, prioridad: t.prioridad
            }));
          },
          error: (err) => { if (err.status === 401) this.router.navigate(['/login']); }
        });
      },
      error: (err) => {
        // Token expirado al recargar → redirigir al login
        if (err.status === 401) this.router.navigate(['/login']);
        console.error('Error cargando perfil', err);
      }
    });

    // 2. Datos iniciales
    this.cargarReportesDesdeBD();
    this.cargarHistorialDesdeBD();

    // 3. WS — cambios de estado de reportes
    this.websocketService.reportes$.subscribe((rb: any) => this._manejarReporteWebSocket(rb));

    // 4. WS — asignado como compañero
    this.websocketService.reporteAsignado$.subscribe((rb: any) => {
      const r = this._mapearReporte(rb);
      if (!this.reportesEntrantes.some(x => x.id === r.id)) {
        r.estado = EstadoReporte.EN_PROCESO;
        this.reportesEntrantes.unshift(r);
        this.estadoAgente = 'OCUPADO';
        this.notificaciones.unshift({
          tipo:  'REPORTE',
          texto: `Fuiste asignado como compañero en: ${r.direccion}`,
          hora:  new Date().toLocaleTimeString(), data: r
        });
      }
    });

    // 5. WS — nuevas tareas
    this.websocketService.tareas$.subscribe((tb: any) => {
      const t: Tarea = {
        id: tb.id, titulo: tb.titulo, descripcion: tb.descripcion,
        admin: 'Administrador', estado: tb.estado,
        hora: tb.hora, fecha: tb.fecha, prioridad: tb.prioridad
      };
      this.tareasAdmin.unshift(t);
      this.notificaciones.unshift({
        tipo: 'TAREA', texto: `Nueva tarea: ${t.titulo}`,
        hora: new Date().toLocaleTimeString(), data: t
      });
    });
  }

  ngOnDestroy() { this.websocketService.disconnect(); }
}
