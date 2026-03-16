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
import { signal } from '@angular/core';


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
  placaAgente?: string;
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
  leida: boolean;
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


  filtroHistorial: 'TODOS' | 'ACEPTADOS' | 'RECHAZADOS' = 'TODOS';

  abrirHistorial() {
    this.filtroHistorial = 'TODOS';
    this.vistaActual = 'historial';
  }

  abrirHistorialResueltos() {
    this.filtroHistorial = 'ACEPTADOS';
    this.vistaActual = 'historial';
  }

  abrirHistorialRechazados() {
    this.filtroHistorial = 'RECHAZADOS';
    this.vistaActual = 'historial';
  }

  navegarAActividad(evento: { tipo: string; id: number }) {
    if (evento.tipo === 'Reporte completado') {
      const reporte = this.historialReportes.find(r => r.id === evento.id);
      if (reporte) {
        this.verDetalleHist(reporte);
      }
    } else if (evento.tipo === 'Tarea completada') {
      this.filtroTareas = 'HECHAS';
      this.cambiarVista('tareas');
    }
  }

  EstadoReporte = EstadoReporte;
  reporteDesdeHistorial: Reporte | null = null;
  origenDetalle: 'historial' | 'reportes' = 'reportes';

  vistaActual: VistaAgente = 'dashboard';
  estadoAgente: 'DISPONIBLE' | 'OCUPADO' | 'FUERA_SERVICIO' = 'DISPONIBLE';

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
  filtroTareas: 'PENDIENTES' | 'HECHAS' | 'TODAS' = 'PENDIENTES';
  notificaciones: Notificacion[] = [];

  perfilAgente: {
    nombre: string; placa: string; documento: string;
    telefono: string; correo: string; foto: string;
    resumenProfesional1?: string;
    resumenProfesional2?: string;
    resumenProfesional3?: string;
    resumenProfesional4?: string;
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
    // Ya hay una tarea en proceso
    if (this.tareasAdmin.some(x => x.estado === 'EN PROCESO')) return;
    
    // Ya hay un reporte en proceso - no puede hacer ambas cosas a la vez
    if (this.hayEnProceso) return;

    // Si está en FUERA_SERVICIO, automáticamente pasa a DISPONIBLE y luego OCUPADO
    if (this.estadoAgente === 'FUERA_SERVICIO') {
      this.agenteService.actualizarEstado('DISPONIBLE').subscribe({
        next: () => {
          this.estadoAgente = 'DISPONIBLE';
          this.comenzarTareaInterno(t);
        },
        error: (err) => console.error('Error al activar servicio', err)
      });
    } else {
      this.comenzarTareaInterno(t);
    }
  }

  private comenzarTareaInterno(t: Tarea) {
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
      this.estadoAgente = 'DISPONIBLE';
      this.agenteService.actualizarEstado('DISPONIBLE').subscribe();
    });
  }

  // ================================
  // ACEPTAR REPORTE
  // El hijo ya actualizó su reportesScroll (optimista).
  // Aquí solo hacemos el HTTP y actualizamos reportesEntrantes.
  // ================================
  aceptarReporte(r: Reporte) {
    // Ya hay un reporte en proceso
    if (this.hayEnProceso) return;
    
    // Ya hay una tarea en proceso - no puede hacer ambas cosas a la vez
    if (this.tareasAdmin.some(t => t.estado === 'EN PROCESO')) return;

    // Si está en FUERA_SERVICIO, automáticamente pasa a DISPONIBLE y luego OCUPADO
    if (this.estadoAgente === 'FUERA_SERVICIO') {
      this.agenteService.actualizarEstado('DISPONIBLE').subscribe({
        next: () => {
          this.estadoAgente = 'DISPONIBLE';
          this.aceptarReporteInterno(r);
        },
        error: (err) => console.error('Error al activar servicio', err)
      });
    } else {
      this.aceptarReporteInterno(r);
    }
  }

  private aceptarReporteInterno(r: Reporte) {
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
        this.agenteService.actualizarEstado('OCUPADO').subscribe();
      },
      error: (err) => {
        console.error('Error aceptando reporte', err);
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
        this.estadoAgente = 'DISPONIBLE';

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
        this.estadoAgente = data.estado || 'DISPONIBLE';
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
    const placaActual = this.perfilAgente.placa?.toUpperCase() || '';
    const placaCompanero = r.placaCompanero?.toUpperCase() || '';
    const placaAgente = r.placaAgente?.toUpperCase() || '';
    
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
      nombreCompanero:  r.nombreCompanero,
      placaAgente:      r.placaAgente,
      esCompanero:      r.acompanado && placaCompanero === placaActual && placaAgente !== placaActual
    };
  }

  // ================================
  // WEBSOCKET — cambios de estado
  // ================================
  private _manejarReporteWebSocket(rb: any) {
    const nuevo = this._mapearReporte(rb);
    const idx   = this.reportesEntrantes.findIndex(r => r.id === nuevo.id);

    console.log('🔍 Procesando reporte:', nuevo.estado, 'idx:', idx, 'id:', nuevo.id);

    switch (nuevo.estado) {

      case EstadoReporte.FINALIZADO:
        // Finalizado desde otro dispositivo (el compañero lo finalizó)
        if (idx !== -1) {
          this.reportesEntrantes.splice(idx, 1);
          this.estadoAgente = 'DISPONIBLE';
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
        console.log('📝 Es PENDIENTE, idx:', idx);
        // Reporte nuevo
        if (idx === -1) {
          console.log('➕ Agregando reporte y creando notificación');
          this.reportesEntrantes.unshift(nuevo);
          this.notificaciones.unshift({
            tipo:  'REPORTE',
            texto: `Nuevo reporte en ${nuevo.direccion}`,
            hora:  new Date().toLocaleTimeString(),
            data:  nuevo,
            leida: false
          });
          this._ordenarNotificaciones();
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

  // Verifica si puede aceptar reportes (no debe tener tarea en proceso)
  get puedeAceptarReportes(): boolean {
    const hayTareaEnProceso = this.tareasAdmin.some(t => t.estado === 'EN PROCESO');
    return !hayTareaEnProceso;
  }

  // Verifica si puede comenzar tareas (no debe tener reporte en proceso)
  get puedeComenzarTarea(): boolean {
    return !this.hayEnProceso;
  }

  // ================================
  // VISTAS
  // ================================
  toggleServicio(nuevoEstado: 'DISPONIBLE' | 'FUERA_SERVICIO') {
    if (nuevoEstado === 'FUERA_SERVICIO' && (this.hayEnProceso || this.estadoAgente === 'OCUPADO')) {
      alert('No puedes ponerte en FUERA_SERVICIO mientras tienes un reporte o tarea en proceso');
      return;
    }
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
    if (v !== 'tareas' || this.filtroTareas !== 'HECHAS') {
      this.filtroTareas = 'PENDIENTES';
    }
    if (v === 'historial') this.cargarHistorialDesdeBD();
    if (v === 'perfil') this.cargarPerfilDesdeBD();
  }

  volverDesdeDetalle(origen: 'historial' | 'reportes') {
    this.reporteDesdeHistorial = null;
    this.vistaActual           = origen;
  }

  toggleNotificaciones() {
    if (!this.mostrarNotificaciones) {
      this.notificaciones.forEach(n => n.leida = true);
    }
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
  }

  get notificacionesNoLeidas(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  private _ordenarNotificaciones() {
    this.notificaciones.sort((a, b) => {
      if (a.leida !== b.leida) return a.leida ? 1 : -1;
      if (a.tipo === 'TAREA' && b.tipo !== 'TAREA') return -1;
      if (a.tipo !== 'TAREA' && b.tipo === 'TAREA') return 1;
      return 0;
    });
  }

  abrirNotif(n: any) {
    n.leida = true;
    if (n.tipo === 'REPORTE') this.vistaActual = 'reportes';
    if (n.tipo === 'TAREA')   this.vistaActual = 'tareas';
    this.mostrarNotificaciones = false;
  }

  updateConfig(config: any) {
    // Los estilos ya se aplican desde el template via [class.dark], [class.cb] y [style.font-size.px]
  }

  sidebarAbierto = false;
  toggleSidebar() { this.sidebarAbierto = !this.sidebarAbierto; }
  cerrarSidebar()  { this.sidebarAbierto = false; }

  reiniciarCronometroSignal: number = 0;

  cerrarSesion() {
    this.reiniciarCronometroSignal++;
    setTimeout(() => {
      localStorage.removeItem('agente_tiempo_activo_inicio');
      this.authService.logout().subscribe({
        next:  () => { this.websocketService.disconnect(); this.router.navigate(['/login']); },
        error: () => { this.router.navigate(['/login']); }
      });
    }, 100);
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
          foto:      data.foto || 'https://randomuser.me/api/portraits/men/32.jpg',
          resumenProfesional1: data.resumenProfesional1 || '',
          resumenProfesional2: data.resumenProfesional2 || '',
          resumenProfesional3: data.resumenProfesional3 || '',
          resumenProfesional4: data.resumenProfesional4 || ''
        };
        this.estadoAgente = data.estado || 'DISPONIBLE';
        if (data.placa) this.websocketService.connect(data.placa);

        this.agenteService.getTareasAgente().subscribe({
          next: (tareas: any[]) => {
            this.tareasAdmin = tareas.map(t => ({
              id: t.id, titulo: t.titulo, descripcion: t.descripcion,
              admin: 'Administrador', estado: t.estado,
              hora: t.hora, fecha: t.fecha, prioridad: t.prioridad,
              fechaInicio: t.fechaInicio ? new Date(t.fechaInicio) : undefined,
              fechaFin: t.fechaFin ? new Date(t.fechaFin) : undefined
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
    this.websocketService.reportes$.subscribe((rb: any) => {
      console.log('📥 WS: Reporte recibido en agente:', rb.estado, rb.direccion);
      this._manejarReporteWebSocket(rb);
    });

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
          hora:  new Date().toLocaleTimeString(), data: r, leida: false
        });
        this._ordenarNotificaciones();
      }
    });

    // 5. WS — nuevas tareas
    this.websocketService.tareas$.subscribe((tb: any) => {
      const t: Tarea = {
        id: tb.id, titulo: tb.titulo, descripcion: tb.descripcion,
        admin: 'Administrador', estado: tb.estado,
        hora: tb.hora, fecha: tb.fecha, prioridad: tb.prioridad,
        fechaInicio: tb.fechaInicio ? new Date(tb.fechaInicio) : undefined,
        fechaFin: tb.fechaFin ? new Date(tb.fechaFin) : undefined
      };
      this.tareasAdmin.unshift(t);
      this.notificaciones.unshift({
        tipo: 'TAREA', texto: `Nueva tarea: ${t.titulo}`,
        hora: new Date().toLocaleTimeString(), data: t, leida: false
      });
      this._ordenarNotificaciones();
    });
  }

  ngOnDestroy() { this.websocketService.disconnect(); }
}
