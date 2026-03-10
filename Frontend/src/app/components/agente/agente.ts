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
import { OnInit } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { WebsocketService } from '../../service/websocket.service';
import { Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';


    export enum EstadoReporte {
      PENDIENTE = 'pendiente',
      EN_PROCESO = 'en_proceso',
      RECHAZADO = 'rechazado',
      FINALIZADO = 'finalizado'
    }


    export interface Reporte {
    id:number;
    tipoInfraccion:string;
    direccion:string;
    horaIncidente:string;
    fechaIncidente: Date;
    descripcion:string;
    foto:string ;
    latitud:number;
    longitud:number;
    etiqueta:string;
    lat?:number;
    lng?:number;
    estado?: EstadoReporte;
    fechaAceptado?: Date; 
    fechaFinalizado?: Date;
    resumenOperativo?: string;
    fechaRechazado?: Date;
    acompanado?: boolean;
    placaCompanero?: string;
    }

    export interface Tarea {
      id:number;
      titulo:string;
      admin:string;
      descripcion:string;
      estado:'PENDIENTE'|'EN PROCESO'|'FINALIZADO'|'RECHAZADO';
      hora:string;
      fecha: string;
      prioridad: 'BAJA'|'MEDIA'|'ALTA';
      fechaInicio?: Date;
      fechaFin?: Date;
      resumen?: string;
    }

    export interface Notificacion {
    tipo:'REPORTE'|'TAREA';
    texto:string;
    hora:string;
    data?:any;
    }

    type VistaAgente =
    | 'dashboard'
    | 'reportes'
    | 'tareas'
    | 'historial'
    | 'perfil'
    | 'configuracion';

    @Component({
    selector: 'app-agente',
    standalone: true,
    imports: [
      CommonModule,
      FormsModule,
      SidebarAgente,
      Dashboard,
      Reportes,
      Historial,
      Tareas,
      PerfilAgente,
      Configuracion
    ],
    templateUrl: 'agente.html',
    styleUrls: ['agente.css']
    })


export class Agente implements OnInit, OnDestroy {


    
    EstadoReporte = EstadoReporte;
    reporteDesdeHistorial: Reporte | null = null;

    origenDetalle: 'historial' | 'reportes' = 'reportes';



    constructor(
      private agenteService: AgenteServiceTs,
      private websocketService: WebsocketService,
      private authService: AuthService,
      private router: Router
    ) {}


    vistaActual: VistaAgente = 'dashboard';

    estadoAgente:'LIBRE'|'OCUPADO'|'FUERA_SERVICIO' = 'LIBRE';

    toggleServicio(nuevoEstado:'LIBRE'|'FUERA_SERVICIO'){

      this.estadoAgente = nuevoEstado;

      this.agenteService.actualizarEstado(nuevoEstado).subscribe();

    }

    config = {
      modoNoche:false,
      daltonismo:false,
      fontSize:16
    };

    mostrarNotificaciones = false;

    reporteHistDetalle: Reporte | null = null


    historialReportes:Reporte[]=[];

      reportesEntrantes:Reporte[]=[
        {
          id:1,
          tipoInfraccion:'Mal parqueo',
          direccion:'Carrera 15 #23-40',
          horaIncidente:'13:05',
          fechaIncidente: new Date(),
          descripcion:'Vehículo bloqueando entrada',
          foto:'https://images.unsplash.com/photo-1590483734724-38817405119c?w=500',
          latitud:4.653,
          longitud:-74.083,
          etiqueta:'Alta',
          lat:4.653,
          lng:-74.083,
          estado: EstadoReporte.PENDIENTE
        },
        {
          id:2,
          tipoInfraccion:'Accidente leve',
          direccion:'Calle 80 #45-20',
          horaIncidente:'14:20',
          fechaIncidente: new Date(),
          descripcion:'Choque entre dos motos',
          foto:'https://images.unsplash.com/photo-1519583272095-6433daf26b6e?w=500',
          latitud:4.670,
          longitud:-74.080,
          etiqueta:'Alta',
          lat:4.670,
          lng:-74.080,
          estado: EstadoReporte.PENDIENTE
        }
      ];

      tareasAdmin:Tarea[]=[
        {
          id:1,
          titulo:'Operativo alcoholemia',
          admin:'Admin Central',
          descripcion:'Apoyar retén zona norte',

          estado:'PENDIENTE',
          hora:'10:00 AM',
          fecha:'2026-06-15',
          prioridad: 'ALTA'
        },
        {
          id:2,
          titulo:'Control vehicular',
          admin:'Supervisor',
          descripcion:'Revisión documentos vehículos pesados',
          estado:'FINALIZADO',
          hora:'02:00 PM',
          fecha:'2026-06-15',
          prioridad: 'MEDIA',
          fechaInicio: new Date(),
          fechaFin: new Date(),
          resumen:'Operativo realizado sin novedades'
        }
      ];

      notificaciones:Notificacion[]=[
        {
          tipo:'REPORTE',
          texto:'Nuevo reporte recibido',
          hora:'Hace 2 min'
        },
        {
          tipo:'TAREA',
          texto:'Nueva tarea asignada',
          hora:'Hace 10 min'
        }
      ];

      perfilAgente!: {
        nombre:string;
        placa:string;
        documento:string;
        telefono:string;
        correo:string;
        foto:string;
      };


    comenzarTarea(t:Tarea){

      const yaOcupado = this.tareasAdmin.some(
        tarea => tarea.estado === 'EN PROCESO'
      );

      if(yaOcupado) return;

      this.agenteService.actualizarEstadoTarea(t.id,'EN PROCESO')
      .subscribe(()=>{

        t.estado = 'EN PROCESO';
        t.fechaInicio = new Date();

        this.estadoAgente = 'OCUPADO';

        this.agenteService.actualizarEstado('OCUPADO').subscribe();

      });

    }

    finalizarTarea(t:Tarea){

      this.agenteService.actualizarEstadoTarea(t.id,'FINALIZADO')
      .subscribe(()=>{

        t.estado = 'FINALIZADO';
        t.fechaFin = new Date();

        this.estadoAgente = 'LIBRE';

        this.agenteService.actualizarEstado('LIBRE').subscribe();

      });

    }

    aceptarReporte(r: Reporte){

      const yaHayEnProceso = this.reportesEntrantes.some(
        rep => rep.estado === EstadoReporte.EN_PROCESO
      );

      if (yaHayEnProceso) return;

      this.agenteService.tomarReporte(r.id).subscribe({

        next: () => {

          r.estado = EstadoReporte.EN_PROCESO;
          r.fechaAceptado = new Date();
          this.estadoAgente = 'OCUPADO';
          this.agenteService.actualizarEstado('OCUPADO').subscribe();

        },

        error: () => {
          console.error('Error aceptando reporte');
        }

      });

    }

    cerrarSesion() {

      /* this.agenteService.actualizarEstado('FUERA_SERVICIO').subscribe();*/

      this.authService.logout().subscribe({
        next: () => {

          this.websocketService.disconnect(); // cerrar websocket

          this.router.navigate(['/login']); // volver al login
        },

        error: (err) => {
          console.error('Error cerrando sesión', err);
          this.router.navigate(['/login']);
        }
      });

    }

    rechazarReporte(r:Reporte){
      if (r.estado === EstadoReporte.RECHAZADO) return;

      r.estado = EstadoReporte.RECHAZADO;
      r.fechaRechazado = new Date();

      this.historialReportes.push({ ...r });

      this.reportesEntrantes =
        this.reportesEntrantes.filter(x => x.id !== r.id);

      this.reporteDesdeHistorial = null;
    }

    finalizarReporte(r: Reporte){

      this.historialReportes.push({ ...r });

      this.reportesEntrantes =
        this.reportesEntrantes.filter(x => x.id !== r.id);

      this.estadoAgente = 'LIBRE';
      this.agenteService.actualizarEstado('LIBRE').subscribe();
    }

    verDetalleHist(r: Reporte) {
        this.origenDetalle = 'historial';
        this.reporteDesdeHistorial = r;
        this.vistaActual = 'reportes';
    } 

    cambiarVista(v: VistaAgente){
        this.vistaActual = v;
        this.reporteDesdeHistorial = null;
        this.origenDetalle = 'reportes'; // importante si estamos usando el sistema de origen
    }

    volverDesdeDetalle(origen: 'historial' | 'reportes'){
        this.reporteDesdeHistorial = null;
        this.vistaActual = origen;
    }

    toggleNotificaciones(){
        this.mostrarNotificaciones = !this.mostrarNotificaciones;
    }

    abrirNotif(n:any){

        if(n.tipo === 'REPORTE'){
          this.vistaActual = 'reportes';
        }

        if(n.tipo === 'TAREA'){
          this.vistaActual = 'tareas';
        }

        this.mostrarNotificaciones = false;
    }

    get hayEnProceso(): boolean {
      return this.reportesEntrantes.some(
        r => r.estado === EstadoReporte.EN_PROCESO
      );
    }


    updateConfig(config: any) {
      document.body.classList.toggle('dark-mode', config.modoNoche);
      document.documentElement.style.setProperty(
        '--font-size-base',
        config.fontSize + 'px'
      );
    }


    asignarReporteACompanero(reporte: Reporte){ // esto va en el backend solo es prueba
      console.log(
        `Asignando reporte ${reporte.id} al agente ${reporte.placaCompanero}`
      );

      // Aquí deberías llamar al backend
      // agenteService.asignarACompanero(...)
    }

    // responsive

    sidebarAbierto = false;

    toggleSidebar() {
      this.sidebarAbierto = !this.sidebarAbierto;
    }

    cerrarSidebar() {
      this.sidebarAbierto = false;
    }

    /*para trear los datos */

    cargarReportesDesdeBD() {

      this.agenteService.getReportesAgente().subscribe({

        next: (data:any[]) => {

          this.reportesEntrantes = data.map((r:any):Reporte => ({
            id: r.id,
            tipoInfraccion: r.tipoInfraccion,
            direccion: r.direccion,
            horaIncidente: r.horaIncidente ?? '',
            fechaIncidente: r.fechaIncidente 
              ? new Date(r.fechaIncidente)
              : new Date(),
            descripcion: r.descripcion,
            foto: r.urlFoto || '',
            latitud: r.latitud,
            longitud: r.longitud, 
            lat: r.latitud,
            lng: r.longitud,
            etiqueta: r.prioridad,
            estado: ((r.estado || 'PENDIENTE') as string).toLowerCase() as EstadoReporte
          }));

        },

        error: (err) => {
          console.error('Error cargando reportes', err);
        }

      });

    }


    ngOnInit() {

      // 1️⃣ cargar perfil del agente
      this.agenteService.getPerfil().subscribe({
        next: (data) => {

          this.perfilAgente = {
            nombre: data.nombreCompleto,
            documento: data.numeroDocumento,
            correo: data.email,
            placa: data.placa || 'N/A',
            telefono: data.telefono || 'N/A',
            foto: 'https://randomuser.me/api/portraits/men/32.jpg'
          };
          this.estadoAgente = data.estado || 'LIBRE';

          // 🔌 conectar websocket con la placa real
          if (data.placa) {
            this.websocketService.connect(data.placa);
          }

          // 2️⃣ 🔵 CARGAR TAREAS DESDE BD (AQUI VA)
          this.agenteService.getTareasAgente().subscribe({

            next:(data:any[]) => {

              this.tareasAdmin = data.map(t => ({
                id: t.id,
                titulo: t.titulo,
                descripcion: t.descripcion,
                admin: "Administrador",
                estado: t.estado,
                hora: t.hora,
                fecha: t.fecha,
                prioridad: t.prioridad
              }));

            },

            error:(err)=>{
              console.error("Error cargando tareas",err);
            }

          });

        },

        error: (err) => {
          console.error('Error cargando perfil', err);
        }
      });


      // 3️⃣ cargar reportes existentes
      this.cargarReportesDesdeBD();


      // 4️⃣ escuchar nuevos reportes
      this.websocketService.reportes$.subscribe((reporteBackend:any) => {

        const nuevoReporte:Reporte = {
          id: reporteBackend.id,
          tipoInfraccion: reporteBackend.tipoInfraccion,
          direccion: reporteBackend.direccion,
          horaIncidente: reporteBackend.horaIncidente ?? '',
          fechaIncidente: reporteBackend.fechaIncidente
            ? new Date(reporteBackend.fechaIncidente)
            : new Date(),
          descripcion: reporteBackend.descripcion,
          foto: reporteBackend.urlFoto || '',
          latitud: reporteBackend.latitud,
          longitud: reporteBackend.longitud,
          lat: reporteBackend.latitud,
          lng: reporteBackend.longitud,
          etiqueta: reporteBackend.prioridad,
          estado: reporteBackend.estado?.toLowerCase() as EstadoReporte
        };

        const existe = this.reportesEntrantes.some(
          r => r.id === nuevoReporte.id
        );

        if(!existe){

          this.reportesEntrantes.unshift(nuevoReporte);

          this.notificaciones.unshift({
            tipo:'REPORTE',
            texto:`Nuevo reporte en ${nuevoReporte.direccion}`,
            hora: new Date().toLocaleTimeString(),
            data:nuevoReporte
          });

        }

      });


      // 5️⃣ escuchar nuevas tareas por WebSocket
      this.websocketService.tareas$.subscribe((tareaBackend:any) => {

        const nuevaTarea: Tarea = {
          id: tareaBackend.id,
          titulo: tareaBackend.titulo,
          descripcion: tareaBackend.descripcion,
          admin: "Administrador",
          estado: tareaBackend.estado,
          hora: tareaBackend.hora,
          fecha: tareaBackend.fecha,
          prioridad: tareaBackend.prioridad
        };

        this.tareasAdmin.unshift(nuevaTarea);

        this.notificaciones.unshift({
          tipo:'TAREA',
          texto:`Nueva tarea asignada: ${nuevaTarea.titulo}`,
          hora:new Date().toLocaleTimeString(),
          data:nuevaTarea
        });

      });

    }

    ngOnDestroy(){
      this.websocketService.disconnect();
    }
                 
}