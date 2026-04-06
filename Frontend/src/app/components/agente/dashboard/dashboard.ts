import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AfterViewInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { AgenteServiceTs } from '../../../service/agente.service';
import { Reporte, EstadoReporte, Tarea } from '../agente';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})

export class Dashboard implements AfterViewInit, OnInit, OnDestroy, OnChanges {


  /*Constructor*/

  constructor(private agenteService: AgenteServiceTs) { }


  // =============================
  // DATOS PARA LAS TARJETAS DEL DASHBOARD
  // =============================
  // Reportes que han llegada en el día (del backend)
  reportesPeriodo: number = 0;
  // Reportes en estado pendiente (del backend)
  reportesPendientes: number = 0;
  // Reportes resueltos en el rango de fechas (del backend)
  reportesResueltos: number = 0;
  // Reportes rechazados en el rango de fechas (del backend)
  reportesRechazados: number = 0;

  // Historial de reportes del agente (para las gráficas y actividad)
  historialReportes: Reporte[] = [];

  // Actividad reciente: lista de objetos con tipo, texto, hora e id
  actividadReciente: { tipo: string; texto: string; hora: string; id: number }[] = [];


  /*Inputs y Outputs*/

  @Input() estadoAgente!: string;
  @Input() tiempoActivo: string = '00:00:00';
  @Input() tareas: Tarea[] = [];
  private _reiniciarSignal: number = 0;
  @Input() set reiniciarCronometro$(value: number) {
    if (value > this._reiniciarSignal) {
      this._reiniciarSignal = value;
    }
  }

  @Output() irHistorial = new EventEmitter<void>();
  @Output() irReportes = new EventEmitter<void>();
  @Output() irResueltos = new EventEmitter<void>();
  @Output() irRechazados = new EventEmitter<void>();
  @Output() irActividad = new EventEmitter<{ tipo: string; id: number }>();

  tiempoFormateado: string = '00:00:00';

  ngOnInit() {
    this.tiempoFormateado = this.tiempoActivo;
    this.cargarEstadisticas();
  }

  get tituloReportes(): string {
    if (this.modoGrafica === 'SEMANA') return 'Reportes semana';
    if (this.modoGrafica === 'ANIO') return 'Reportes año';
    return 'Reportes hoy';
  }

  get tituloResueltos(): string {
    if (this.modoGrafica === 'SEMANA') return 'Resueltos semana';
    if (this.modoGrafica === 'ANIO') return 'Resueltos año';
    return 'Resueltos hoy';
  }

  get tituloRechazados(): string {
    if (this.modoGrafica === 'SEMANA') return 'Rechazados semana';
    if (this.modoGrafica === 'ANIO') return 'Rechazados año';
    return 'Rechazados hoy';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tiempoActivo']) {
      this.tiempoFormateado = changes['tiempoActivo'].currentValue;
    }
    if (changes['tareas'] && !changes['tareas'].firstChange) {
      this.construirActividadReciente();
    }
    if (changes['reiniciarCronometro$'] && !changes['reiniciarCronometro$'].firstChange) {
      this.tiempoFormateado = '00:00:00';
    }
  }

  ngOnDestroy() {
  }

  // =============================
  // CARGAR ESTADÍSTICAS DESDE EL BACKEND
  // =============================
  cargarEstadisticas() {
    // Usar el endpoint de estadísticas completas (tarjetas + gráficas)
    this.agenteService.getEstadisticasCompletas(this.fechaInicio, this.fechaFin).subscribe({
      next: (data) => {
        // Actualizar las tarjetas con los datos del backend
        this.reportesPeriodo = data.reportesHoy || 0;
        this.reportesPendientes = data.totalPendientes || 0;
        this.reportesResueltos = data.reportesResueltos || 0;
        this.reportesRechazados = data.reportesRechazados || 0;

        // Actualizar las fechas si el backend las cambió
        if (data.fechaInicio) this.fechaInicio = data.fechaInicio;
        if (data.fechaFin) this.fechaFin = data.fechaFin;

        // Actualizar las estadísticas de las gráficas desde el backend
        if (data.statsSemana) {
          this.statsSemana = data.statsSemana;
        }
        if (data.statsAnio) {
          this.statsAnio = data.statsAnio;
        }
        if (data.statsDia) {
          this.statsDia = data.statsDia;
        }

        // Crear la gráfica con los nuevos datos
        this.crearGrafica();

        // También cargar historial para la actividad reciente
        this.cargarHistorialYActividad();
      },
      error: (err) => {
        console.error('Error cargando estadísticas del dashboard', err);
        // En caso de error, usar valores por defecto
        this.reportesPeriodo = 0;
        this.reportesPendientes = 0;
        this.reportesResueltos = 0;
        this.reportesRechazados = 0;
      }
    });
  }

  // Cargar historial para actividad reciente
  private cargarHistorialYActividad() {
    this.agenteService.getHistorialAgente().subscribe({
      next: (data) => {
        this.historialReportes = data.map(r => this._mapearReporte(r));
        this.construirActividadReciente();
      }
    });
  }

  // Construye la lista de actividad reciente desde el historial (reportes + tareas)
  private construirActividadReciente() {
    interface ActividadItem {
      tipo: string;
      texto: string;
      hora: string;
      fecha: Date;
      id: number;
    }

    const actividades: ActividadItem[] = [];

    // Agregar reportes finalizados
    const reportesFinalizados = this.historialReportes
      .filter(r => r.estado === EstadoReporte.FINALIZADO && r.fechaFinalizado);

    for (const r of reportesFinalizados) {
      actividades.push({
        tipo: 'Reporte completado',
        texto: r.direccion,
        hora: this.getTiempoTranscurrido(r.fechaFinalizado!),
        fecha: new Date(r.fechaFinalizado!),
        id: r.id!
      });
    }

    // Agregar tareas finalizadas
    const tareasFinalizadas = this.tareas.filter(t => t.estado === 'FINALIZADO' && t.fechaFin);

    for (const t of tareasFinalizadas) {
      const fechaTarea = new Date(t.fechaFin!);
      actividades.push({
        tipo: 'Tarea completada',
        texto: t.titulo,
        hora: this.getTiempoTranscurrido(fechaTarea),
        fecha: fechaTarea,
        id: t.id
      });
    }

    // Ordenar por fecha (más reciente primero) y tomar solo los 3 primeros
    actividades.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    const ultimas = actividades.slice(0, 3);

    this.actividadReciente = ultimas.map(a => ({
      tipo: a.tipo,
      texto: a.texto,
      hora: a.hora,
      id: a.id
    }));
  }

  // Método para manejar click en actividad reciente
  navegarAActividad(item: { tipo: string; id: number }) {
    this.irActividad.emit({ tipo: item.tipo, id: item.id });
  }

  // Devuelve un string como "Hace 5 minutos", "Hace 2 horas", etc.
  private getTiempoTranscurrido(fecha: Date): string {
    const ahora = new Date();
    const diff = ahora.getTime() - new Date(fecha).getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
    if (horas > 0) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    if (minutos > 0) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    return 'Ahora mismo';
  }

  // =============================
  // MAPEO BACKEND → Reporte
  // Convierte los datos crudos del backend al formato Reporte
  // =============================
  private _mapearReporte(r: any): Reporte {
    return {
      id: r.id,
      tipoInfraccion: r.tipoInfraccion,
      direccion: r.direccion,
      horaIncidente: r.horaIncidente ?? '',
      fechaIncidente: r.fechaIncidente ? new Date(r.fechaIncidente) : new Date(),
      descripcion: r.descripcion,
      foto: r.urlFoto || '',
      latitud: r.latitud,
      longitud: r.longitud,
      lat: r.latitud,
      lng: r.longitud,
      etiqueta: r.prioridad,
      estado: ((r.estado || 'pendiente') as string).toLowerCase() as EstadoReporte,
      fechaAceptado: r.fechaAceptado ? new Date(r.fechaAceptado) : undefined,
      fechaFinalizado: r.fechaFinalizado ? new Date(r.fechaFinalizado) : undefined,
      fechaRechazado: r.fechaRechazado ? new Date(r.fechaRechazado) : undefined,
      resumenOperativo: r.resumenOperativo,
      acompanado: r.acompanado ?? false,
      placaCompanero: r.placaCompanero,
      nombreCompanero: r.nombreCompanero
    };
  }

  // Obtiene la hora de un reporte (0-23)
  private getHora(r: Reporte): number {
    if (!r.fechaFinalizado) return 0;
    return new Date(r.fechaFinalizado).getHours();
  }

  chart!: Chart;
  tipoGrafica: 'bar' | 'line' | 'pie' = 'bar';

  modoGrafica: 'SEMANA' | 'ANIO' | 'DIA' = 'DIA';

  ngAfterViewInit() {
    const hoy = new Date();
    
    this.fechaFin = hoy.toISOString().split('T')[0];
    this.fechaInicio = hoy.toISOString().split('T')[0];
    
    this.crearGrafica();
  }

  fechaSeleccionada = '';


  cambiarTipoGrafica(tipo: 'bar' | 'line' | 'pie') {
    this.tipoGrafica = tipo;
    this.crearGrafica();
  }


  get maxValor() {
    return Math.max(...this.statsActual.map(s => s.valor));
  }

  get statsNormalizados() {
    const max = this.maxValor;
    return this.statsActual.map(s => ({
      ...s,
      porcentaje: (s.valor / max) * 100
    }));
  }


  fechaInicio = '';
  fechaFin = '';

  // Maneja el cambio de fecha "Desde" - si es mayor que "Hasta", ajusta "Hasta"
  onFechaDesdeChange() {
    if (this.fechaInicio && this.fechaFin) {
      const desde = new Date(this.fechaInicio);
      const hasta = new Date(this.fechaFin);
      if (desde > hasta) {
        this.fechaFin = this.fechaInicio;
      }
    }
    this.filtrarPorRango();
  }

  // Retorna la cantidad de días del rango seleccionado
  getDiasRango(): number {
    if (!this.fechaInicio || !this.fechaFin) return 0;
    const desde = new Date(this.fechaInicio);
    const hasta = new Date(this.fechaFin);
    const diffTime = Math.abs(hasta.getTime() - desde.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  // Filtra las estadísticas por rango de fechas y actualiza tarjetas y gráficas
  filtrarPorRango() {
    this.cargarEstadisticas();
  }

  statsSemana = [
    { label: 'Lun', valor: 40 },
    { label: 'Mar', valor: 70 },
    { label: 'Mie', valor: 30 },
    { label: 'Jue', valor: 90 },
    { label: 'Vie', valor: 60 },
    { label: 'Sab', valor: 20 },
    { label: 'Dom', valor: 50 }
  ];

  statsAnio = [
    { label: 'Ene', valor: 120 },
    { label: 'Feb', valor: 90 },
    { label: 'Mar', valor: 150 },
    { label: 'Abr', valor: 70 },
    { label: 'May', valor: 180 },
    { label: 'Jun', valor: 140 },
    { label: 'Jul', valor: 200 },
    { label: 'Ago', valor: 160 },
    { label: 'Sep', valor: 130 },
    { label: 'Oct', valor: 170 },
    { label: 'Nov', valor: 110 },
    { label: 'Dic', valor: 190 }
  ];

  statsDia = [
    { label: '00', valor: 5 },
    { label: '06', valor: 15 },
    { label: '12', valor: 25 },
    { label: '18', valor: 10 }
  ];
  get statsActual() {
    if (this.modoGrafica === 'SEMANA') return this.statsSemana;
    if (this.modoGrafica === 'ANIO') return this.statsAnio;
    return this.statsDia;
  }

  cambiarModoGrafica(modo: 'SEMANA' | 'ANIO' | 'DIA') {
    this.modoGrafica = modo;
    this.actualizarFechasPorModo(modo);
    this.cargarEstadisticas();
    this.crearGrafica();
  }

  actualizarFechasPorModo(modo: 'SEMANA' | 'ANIO' | 'DIA') {
    const hoy = new Date();
    if (modo === 'SEMANA') {
      const hace7Dias = new Date();
      hace7Dias.setDate(hoy.getDate() - 7);
      this.fechaFin = hoy.toISOString().split('T')[0];
      this.fechaInicio = hace7Dias.toISOString().split('T')[0];
    } else if (modo === 'ANIO') {
      const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
      this.fechaInicio = inicioAnio.toISOString().split('T')[0];
      this.fechaFin = hoy.toISOString().split('T')[0];
    } else {
      this.fechaInicio = hoy.toISOString().split('T')[0];
      this.fechaFin = hoy.toISOString().split('T')[0];
    }
  }

  resetFiltros() {
    this.modoGrafica = 'DIA';
    this.actualizarFechasPorModo('DIA');
    this.cargarEstadisticas();
    this.crearGrafica();
  }


  crearGrafica() {
    const canvas = document.getElementById('miGrafica') as HTMLCanvasElement;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: this.tipoGrafica,
      data: {
        labels: this.statsActual.map(s => s.label),
        datasets: [{
          label: 'Cantidad',
          data: this.statsActual.map(s => s.valor),
          backgroundColor: [
            '#3b82f6',
            '#1d4ed8',
            '#60a5fa',
            '#2563eb',
            '#93c5fd',
            '#0ea5e9',
            '#6366f1',
            '#8b5cf6',
            '#06b6d4',
            '#14b8a6',
            '#10b981',
            '#84cc16'
          ],
          borderRadius: 8,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }


}