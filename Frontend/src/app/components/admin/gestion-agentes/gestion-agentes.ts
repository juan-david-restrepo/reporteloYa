/*=================================================================
  COMPONENTE: GESTIÓN DE AGENTES
  Función: Permite al administrador buscar agentes de tránsito por placa,
  ver su información, asignar tareas y visualizar su historial de reportes.
=================================================================*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';

/*------------------ SERVICIOS ------------------
  - AdminService: Busca y obtiene datos de agentes
  - ReportesService: Obtiene reportes de un agente
  - TareasService: Gestiona tareas (crear, eliminar, obtener)
  - WebsocketService: Recibe actualizaciones en tiempo real
*/
import { AdminService } from '../../../service/admin-agente.service';
import { ReportesService } from '../../../service/reportes.service';
import { TareasService } from '../../../service/tareas.service';

/*------------------ MODELOS ------------------
  - Agente: Define la estructura de un agente
  - Reporte: Define la estructura de un reporte
  - Tarea: Define la estructura de una tarea
*/
import { Agente } from '../../../models/agente.model';
import { Reporte } from '../../../models/reporte.model';
import { Tarea } from '../../../models/tarea.model';

/*------------------ COMPONENTES ------------------
  - SidebarAdmin: Menú lateral del panel de admin
*/
import { SidebarAdmin } from '../sidebar-admin/sidebar-admin';
import { WebsocketService } from '../../../service/websocket.service';


/*========================================================
  DECORADOR @COMPONENT
  Define la configuración base del componente Angular
=========================================================*/
@Component({
  selector: 'app-gestion-agentes',    // Nombre de la etiqueta HTML para usar este componente
  standalone: true,                     // Componente independiente (no necesita módulo)
  imports: [CommonModule, FormsModule, RouterModule, SidebarAdmin],  // Módulos necesarios para la plantilla
  templateUrl: './gestion-agentes.html',   // Archivo de plantilla HTML
  styleUrl: './gestion-agentes.css',        // Archivo de estilos CSS
})

/*========================================================
  CLASE PRINCIPAL
  Gestiona la lógica del componente de gestión de agentes
  Implementa OnInit (inicialización) y OnDestroy (limpieza)
=========================================================*/
export class GestionAgentes implements OnInit, OnDestroy {

  /*------------------ 1. VARIABLES DE ESTADO GENERAL ------------------
    Almacenan los datos principales del componente
  */
  
  placaBuscada: string = '';      // Texto que el admin ingresa para buscar
  agente: Agente | null = null;   // Datos del agente encontrado (null si no hay búsqueda)
  reportes: any[] = [];           // Lista de reportes del agente
  tareas: Tarea[] = [];           // Lista de tareas del agente
  
  /*------------------ ESTADOS DE INTERFAZ ------------------
    Controlan qué se muestra en pantalla
  */
  filtroSeleccionado: 'TODOS' | 'TAREAS' | 'REPORTES' = 'TODOS';  // Filtro activo en historial
  cargando = false;               // Muestra mensaje de carga al buscar
  cargandoReportes = false;       // Muestra carga de reportes
  cargandoTareas = false;         // Muestra carga de tareas
  error = '';                     // Mensaje de error a mostrar
  
  /*------------------ MENÚ RESPONSIVE ------------------
    Controla el menú lateral en dispositivos móviles
  */
  menuAbierto = false; 

  // Suscripción para actualización automática (actualmente comentado)
  private pollingSubscription?: Subscription;


  /*------------------ 2. GETTERS (PROPIEDADES CALCULADAS) ------------------
    Funciones que se usan como propiedades para obtener datos derivados
  */

  // Filtra solo las tareas que están finalizadas
  get tareasFinalizadas(): Tarea[] {
    return this.tareas.filter(t => t.estado === 'FINALIZADO');
  }

  // Retorna la lista de reportes (actualmente igual al array original)
  get reportesHistorial(): any[] {
    return this.reportes; 
  }

  // Convierte el estado del agente a una clase CSS válida
  // Ejemplo: "FUERA_SERVICIO" → "fuera-de-servicio"
  getClaseEstado(estado: string | undefined): string {
    if (!estado) return '';
    return estado.toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
  }


  /*------------------ 3. FORMULARIO DE TAREAS ------------------
    Variables vinculadas a los campos del formulario para crear tareas
  */
  titulo = '';                    // Título de la nueva tarea
  descripcionTarea = '';          // Descripción detallada
  fechaTarea = '';                // Fecha programada
  horaTarea = '';                 // Hora programada
  prioridadTarea: 'BAJA' | 'MEDIA' | 'ALTA' = 'MEDIA';  // Prioridad (default: MEDIA)
  mensajeTarea = '';              // Mensaje de éxito/error tras crear tarea
  fechaMinima = '';               // Fecha mínima permitida (hoy)


  /*------------------ 4. CONTROL DE MODALES (VENTANAS EMERGIDAS) ------------------
    Variables que gestionan la apertura/cierre de ventanas modales
  */
  tareaAEliminar: Tarea | null = null;   // Tarea seleccionada para eliminar
  mostrarModal = false;                   // Controla modal de confirmación de eliminación
  modalDescripcion = false;               // Controla modal de ver descripción larga
  modalAbierto = false;                    // Estado general si algún modal está abierto
  descripcionSeleccionada = '';            // Texto a mostrar en modal de descripción
  tituloModal = 'Detalle';                 // Título del modal de descripción


  /*------------------ 5. CONSTRUCTOR ------------------
    Inicializa los servicios que se usarán en el componente
    Se inyectan por dependencia (Angular maneja esto automáticamente)
  */
  constructor(
    private adminService: AdminService,        // Servicio para buscar agentes
    private reportesService: ReportesService,  // Servicio para reportes
    private tareasService: TareasService,       // Servicio para tareas
    private websocketService: WebsocketService  // Servicio de tiempo real
  ) {}


  /*------------------ 6. MÉTODOS DE CONFIGURACIÓN INICIAL ------------------
    Configuran el entorno del componente al cargar
  */

  // Carga la configuración guardada (modo oscuro y tamaño de fuente)
  private loadSettings() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');

    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
      document.body.style.setProperty('--admin-font-size', savedSize + 'px');
    }
  }

  // Calcula la fecha de hoy y la guarda en formato YYYY-MM-DD
  // Se usa para validar que no se puedan seleccionar fechas pasadas
  private setFechaMinima(): void {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    this.fechaMinima = `${año}-${mes}-${dia}`;
  }


  /*------------------ 7. ngOnInit - INICIALIZACIÓN DEL COMPONENTE ------------------
    Se ejecuta automáticamente cuando el componente comienza a renderizarse
    Aquí se configuran las suscripciones a WebSocket para tiempo real
  */
  ngOnInit(): void {
    // Carga configuraciones guardadas
    this.loadSettings();
    this.setFechaMinima();
    
    // Conecta al servicio WebSocket como administrador
    this.websocketService.connect('admin');

    /*----- SUSCRIPCIÓN A ESTADOS DE AGENTES -----
      Escucha cambios de estado de los agentes en tiempo real
      Si el agente actual cambia de estado, lo actualiza en pantalla
    */
    this.websocketService.estadosAgentes$.subscribe((estado:any)=>{
      if(this.agente && this.agente.placa?.toUpperCase() === estado.placa?.toUpperCase()){
        this.agente.estado = estado.estado;
      }
    });

    /*----- SUSCRIPCIÓN A CAMBIOS DE ESTADO DE TAREA -----
      Escucha cuando una tarea cambia de estado (ej: PENDIENTE → EN PROCESO)
      Actualiza la tarea en la lista local
    */
    this.websocketService.tareaEstado$.subscribe((tarea:any)=>{
      const t = this.tareas.find(x => x.id === tarea.id);
      if(t){
        t.estado = tarea.estado;
      }
    });

    /*----- SUSCRIPCIÓN A NUEVAS TAREAS -----
      Escucha cuando se crea una nueva tarea para el agente actual
      Recarga la lista de tareas
    */
    this.websocketService.tareas$.subscribe((tarea:any) => {
      if (this.agente && tarea.placaAgente === this.agente.placa) {
        this.cargarTareas();
      }
    });

    /*----- SUSCRIPCIÓN A NUEVOS REPORTES -----
      Escucha cuando se crea un nuevo reporte para el agente actual
      Recarga la lista de reportes
    */
    this.websocketService.reportes$.subscribe((reporte:any) => {
      if (this.agente && reporte.placaAgente === this.agente.placa) {
        this.cargarReportes();
      }
    });
  }


  /*------------------ 8. ngOnDestroy - LIMPIEZA AL DESTRUIR ------------------
    Se ejecuta cuando el componente se elimina o navega a otra página
    IMPORTANTE: Siempre desconectar WebSocket y cancelar suscripciones
  */
  ngOnDestroy(): void {
    this.detenerRefresco();
    this.websocketService.disconnect();
  }

  // Detiene cualquier actualización automática activa
  private detenerRefresco(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }


  /*------------------ 9. BÚSQUEDA DE AGENTES ------------------
    Métodos para buscar y obtener datos de un agente
  */

  // Busca un agente por su número de placa
  buscarAgente(): void {
    // Valida que se haya ingresa una placa
    if (!this.placaBuscada.trim()) {
      this.error = 'Ingrese un número de placa';
      return;
    }

    // Normaliza la placa (mayúsculas, sin espacios)
    this.placaBuscada = this.placaBuscada.trim().toUpperCase();

    // Limpia datos anteriores
    this.detenerRefresco();
    this.cargando = true;
    this.error = '';
    this.agente = null;
    this.reportes = [];
    this.tareas = [];
    this.filtroSeleccionado = 'TODOS';

    // Llama al servicio para buscar el agente
    this.adminService.obtenerAgentePorPlaca(this.placaBuscada).subscribe({
      // Si encuentra el agente, guarda los datos y carga reportes/tareas
      next: (data) => {
        this.agente = data;
        this.cargando = false;
        this.cargarReportes();
        this.cargarTareas();
      },
      // Si no encuentra, muestra error
      error: () => {
        this.error = 'No se encontró ningún agente con esa placa';
        this.cargando = false;
      }
    });
  }


  /*------------------ 10. GESTIÓN DE TAREAS ------------------
    Métodos para obtener, crear y eliminar tareas
  */

  // Carga las tareas del agente desde el servidor (con indicador de carga)
  cargarTareas(): void {
    if (!this.agente) return;
    this.cargandoTareas = true;
    this.fetchTareas();
  }

  // Carga tareas sin mostrar indicador de carga (para actualizaciones en背景)
  private cargarTareasSilent(): void {
    if (!this.agente) return;
    this.fetchTareas(true);
  }

  // Método interno que realiza la petición HTTP para obtener tareas
  // silent = true omite el indicador de carga
  private fetchTareas(silent = false): void {
    this.tareasService.obtenerTareasPorAgente(this.agente!.placa)
    .subscribe({
      next: (data: any) => {
        // Maneja diferentes formatos de respuesta del servidor
        if (Array.isArray(data)) {
          this.tareas = data;
        } else if (data.listaTareas) {
          this.tareas = data.listaTareas;
        } else {
          this.tareas = [];
        }
        if (!silent) this.cargandoTareas = false;
      },
      error: () => {
        if (!silent) {
          this.tareas = [];
          this.cargandoTareas = false;
        }
      }
    });
  }

  // Crea y asigna una nueva tarea al agente
  asignarTarea(): void {
    if (!this.agente) return;

    // Valida que todos los campos obligatorios estén llenos
    if (!this.titulo || !this.descripcionTarea || !this.fechaTarea || !this.horaTarea) {
      this.mensajeTarea = 'Complete todos los campos';
      return;
    }

    // Prepara el objeto de la nueva tarea
    const nuevaTarea = {
      titulo: this.titulo,
      descripcion: this.descripcionTarea,
      fecha: this.fechaTarea,
      hora: this.horaTarea,
      prioridad: this.prioridadTarea,
      estado: 'PENDIENTE'  // Estado inicial
    };

    // Envía la tarea al servidor
    this.tareasService.asignarTarea(this.agente.placa, nuevaTarea).subscribe({
      next: () => {
        this.cargarTareas();  // Recarga la lista
        this.mensajeTarea = '¡Tarea añadida con éxito!';
        this.limpiarFormulario();  // Limpia los campos
      },
      error: () => {
        this.mensajeTarea = 'Error al asignar la tarea';
      }
    });
  }

  // Elimina una tarea del agente
  eliminarTarea(tarea: Tarea): void {
    if (!this.agente) return;

    this.tareasService.eliminarTarea(tarea.id!).subscribe({
      next: () => {
        // Actualiza la lista local filtrando la tarea eliminada
        this.tareas = this.tareas.filter(t => t.id !== tarea.id);
        // Si no hay más tareas, el agente queda disponible
        if (this.tareas.length === 0) {
          this.agente!.estado = 'DISPONIBLE';
        }
        this.mensajeTarea = 'Tarea eliminada correctamente';
      },
      error: () => {
        this.mensajeTarea = 'No se pudo eliminar la tarea';
      }
    });
  }


  /*------------------ 11. GESTIÓN DE REPORTES ------------------
    Métodos para obtener el historial de reportes
  */

  // Carga los reportes del agente desde el servidor
  cargarReportes(): void {
    if (!this.agente) return;
    this.cargandoReportes = true;

    this.reportesService.obtenerReportesPorAgente(this.agente.placa).subscribe({
      next: (data) => {
        this.reportes = data;
        this.cargandoReportes = false;
      },
      error: () => {
        this.reportes = [];
        this.cargandoReportes = false;
      }
    });
  }


  /*------------------ 12. CONTROL DE MODALES ------------------
    Métodos para abrir y cerrar las ventanas emergentes
  */

  // Abre el modal para ver una descripción larga
  abrirModalDescripcion(texto: string, titulo: string = 'Detalle'): void {
    this.descripcionSeleccionada = texto;
    this.tituloModal = titulo;
    this.modalDescripcion = true;
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';  // Evita scroll en background
  }

  // Cierra el modal de descripción
  cerrarModalDescripcion(): void {
    this.modalDescripcion = false;
    this.modalAbierto = false;
    this.descripcionSeleccionada = '';
    document.body.style.overflow = 'auto';  // Restaura scroll
  }

  // Abre el modal de confirmación para eliminar una tarea
  abrirModalEliminar(tarea: Tarea): void {
    this.tareaAEliminar = tarea;
    this.mostrarModal = true;
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  // Cancela la eliminación y cierra el modal
  cancelarEliminacion(): void {
    this.tareaAEliminar = null;
    this.mostrarModal = false;
    this.modalAbierto = false;
    document.body.style.overflow = 'auto';
  }

  // Confirma y ejecuta la eliminación de la tarea
  confirmarEliminacion(): void {
    if (!this.tareaAEliminar) return;
    this.eliminarTarea(this.tareaAEliminar);
    this.mostrarModal = false;
    this.modalAbierto = false;
    document.body.style.overflow = 'auto';
  }

  // Limpia los campos del formulario de tarea
  limpiarFormulario(): void {
    this.titulo = '';
    this.descripcionTarea = '';
    this.fechaTarea = '';
    this.horaTarea = '';
    this.prioridadTarea = 'MEDIA';
  }


  /*------------------ 13. FUNCIONES UTILITARIAS ------------------
    Funciones auxiliares para la vista
  */

  // Determina si una tarea puede eliminarse
  // Solo se puede eliminar si está PENDIENTE o RECHAZADA
  puedeEliminar(tarea: any): boolean {
    return tarea.estado !== 'EN PROCESO' && 
           tarea.estado !== 'FINALIZADO';
  }

  // Verifica si hay tareas pendientes en la lista
  hayTareasPendientes(tareas: any[]): boolean {
    return tareas.some(t => t.estado !== 'FINALIZADO');
  }
}