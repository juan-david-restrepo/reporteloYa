import { Component, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';

// Servicios
import { AdminService } from '../../../service/admin-agente.service';
import { ReportesService } from '../../../service/reportes.service';
import { TareasService } from '../../../service/tareas.service';

// Modelos y Componentes
import { Agente } from '../../../models/agente.model';
import { Reporte } from '../../../models/reporte.model';
import { Tarea } from '../../../models/tarea.model';
import { SidebarAdmin } from '../sidebar-admin/sidebar-admin';

@Component({
  selector: 'app-gestion-agentes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarAdmin],
  templateUrl: './gestion-agentes.html',
  styleUrl: './gestion-agentes.css',
})
export class GestionAgentes implements OnDestroy {

  // =========================
  // 1. ESTADO GENERAL
  // =========================
  placaBuscada: string = '';
  agente: Agente | null = null;
  reportes: Reporte[] = [];
  tareas: Tarea[] = [];
  
  // Estado de filtros, carga y responsive
  filtroSeleccionado: 'TODOS' | 'TAREAS' | 'REPORTES' = 'TODOS';
  cargando = false;
  cargandoReportes = false;
  cargandoTareas = false;
  error = '';
  
  // NUEVA PROPIEDAD PARA RESPONSIVE
  menuAbierto = false; 

  private pollingSubscription?: Subscription;

  // =========================
  // 2. GETTERS Y UTILIDADES DE VISTA
  // =========================

  get tareasFinalizadas(): Tarea[] {
    return this.tareas.filter(t => t.estado === 'FINALIZADO');
  }

  get reportesHistorial(): Reporte[] {
    return this.reportes; 
  }

  /**
   * FORMATEA EL ESTADO PARA CSS
   * Convierte "FUERA DE SERVICIO" -> "fuera-de-servicio" para evitar problemas de espacios
   */
  getClaseEstado(estado: string | undefined): string {
    if (!estado) return '';
    return estado.toLowerCase().trim().replace(/\s+/g, '-');
  }

  // =========================
  // 3. FORMULARIO TAREAS
  // =========================
  titulo = '';
  descripcionTarea = '';
  fechaTarea = '';
  horaTarea = '';
  prioridadTarea: 'BAJA' | 'MEDIA' | 'ALTA' = 'MEDIA';
  mensajeTarea = '';

  // =========================
  // 4. MODALES
  // =========================
  tareaAEliminar: Tarea | null = null;
  mostrarModal = false;
  modalDescripcion = false;
  modalAbierto = false; 
  descripcionSeleccionada = '';

  constructor(
    private adminService: AdminService,
    private reportesService: ReportesService,
    private tareasService: TareasService
  ) {}

  ngOnDestroy(): void {
    this.detenerRefresco();
  }

  private detenerRefresco(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  // =========================
  // 5. MÉTODOS DE BÚSQUEDA
  // =========================
  buscarAgente(): void {
    if (!this.placaBuscada.trim()) {
      this.error = 'Ingrese un número de placa';
      return;
    }

    this.detenerRefresco();
    this.cargando = true;
    this.error = '';
    this.agente = null;
    this.reportes = [];
    this.tareas = [];
    this.filtroSeleccionado = 'TODOS';

    this.adminService.obtenerAgentePorPlaca(this.placaBuscada).subscribe({
      next: (data) => {
        this.agente = data;
        this.cargando = false;
        this.cargarReportes();
        this.cargarTareas();
        this.iniciarRefresco();
      },
      error: () => {
        this.error = 'No se encontró ningún agente con esa placa';
        this.cargando = false;
      }
    });
  }

  // =========================
  // 6. GESTIÓN DE TAREAS
  // =========================
  cargarTareas(): void {
    if (!this.agente) return;
    this.cargandoTareas = true;
    this.fetchTareas();
  }

  private cargarTareasSilent(): void {
    if (!this.agente) return;
    this.fetchTareas(true);
  }

  private fetchTareas(silent = false): void {
    this.tareasService.obtenerTareasPorAgente(this.agente!.placa)
    .subscribe({
      next: (data: any) => {
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

  private iniciarRefresco(): void {
    this.detenerRefresco();
    this.pollingSubscription = interval(5000).subscribe(() => {
      this.cargarTareasSilent();
      this.cargarReportes();
    });
  }

  asignarTarea(): void {
    if (!this.agente) return;

    if (!this.titulo || !this.descripcionTarea || !this.fechaTarea || !this.horaTarea) {
      this.mensajeTarea = 'Complete todos los campos';
      return;
    }

    const nuevaTarea = {
      titulo: this.titulo,
      descripcion: this.descripcionTarea,
      fecha: this.fechaTarea,
      hora: this.horaTarea,
      prioridad: this.prioridadTarea,
      estado: 'PENDIENTE'
    };

    this.tareasService.asignarTarea(this.agente.placa, nuevaTarea).subscribe({
      next: () => {
        this.cargarTareas();
        this.mensajeTarea = '¡Tarea añadida con éxito!';
        this.limpiarFormulario();
      },
      error: () => {
        this.mensajeTarea = 'Error al asignar la tarea';
      }
    });
  }

  eliminarTarea(tarea: Tarea): void {
    if (!this.agente) return;

    this.tareasService.eliminarTarea(tarea.id!).subscribe({
      next: () => {
        this.tareas = this.tareas.filter(t => t.id !== tarea.id);
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

  // =========================
  // 7. REPORTES
  // =========================
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

  // =========================
  // 8. CONTROL DE MODALES
  // =========================
  abrirModalDescripcion(texto: string): void {
    this.descripcionSeleccionada = texto;
    this.modalDescripcion = true;
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModalDescripcion(): void {
    this.modalDescripcion = false;
    this.modalAbierto = false;
    this.descripcionSeleccionada = '';
    document.body.style.overflow = 'auto';
  }

  abrirModalEliminar(tarea: Tarea): void {
    this.tareaAEliminar = tarea;
    this.mostrarModal = true;
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  cancelarEliminacion(): void {
    this.tareaAEliminar = null;
    this.mostrarModal = false;
    this.modalAbierto = false;
    document.body.style.overflow = 'auto';
  }

  confirmarEliminacion(): void {
    if (!this.tareaAEliminar) return;
    this.eliminarTarea(this.tareaAEliminar);
    this.mostrarModal = false;
    this.modalAbierto = false;
    document.body.style.overflow = 'auto';
  }

  limpiarFormulario(): void {
    this.titulo = '';
    this.descripcionTarea = '';
    this.fechaTarea = '';
    this.horaTarea = '';
    this.prioridadTarea = 'MEDIA';
  }
}