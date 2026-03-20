import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ActividadReciente {
  id: string;
  tipo: string;
  descripcion: string;
  modulo: string;
  icono: string;
  color: string;
  fecha: string;
  hora: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActividadRecienteService {
  private readonly STORAGE_KEY = 'actividades_recientes';
  private readonly MAX_ACTIVIDADES = 20;
  
  private actividadesSubject = new BehaviorSubject<ActividadReciente[]>([]);
  actividades$ = this.actividadesSubject.asObservable();

  constructor() {
    this.cargarActividades();
  }

  private cargarActividades() {
    const userId = this.getUserId();
    if (!userId) return;
    
    const key = `${this.STORAGE_KEY}_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const actividades = JSON.parse(stored);
        this.actividadesSubject.next(actividades);
      } catch (e) {
        this.actividadesSubject.next([]);
      }
    }
  }

  private getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  private guardarActividades(actividades: ActividadReciente[]) {
    const userId = this.getUserId();
    if (!userId) return;
    
    const key = `${this.STORAGE_KEY}_${userId}`;
    localStorage.setItem(key, JSON.stringify(actividades));
  }

  agregarActividad(tipo: string, descripcion: string, modulo: string, icono: string, color: string) {
    const now = new Date();
    const fecha = now.toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
    const hora = now.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    const actividad: ActividadReciente = {
      id: this.generateId(),
      tipo,
      descripcion,
      modulo,
      icono,
      color,
      fecha,
      hora,
      timestamp: now.getTime()
    };

    const actividades = [actividad, ...this.actividadesSubject.value];
    
    // Limitar el número de actividades
    const actividadesLimitadas = actividades.slice(0, this.MAX_ACTIVIDADES);
    
    this.actividadesSubject.next(actividadesLimitadas);
    this.guardarActividades(actividadesLimitadas);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Métodos de conveniencia para tipos específicos de actividades
  registrarCreacionReporte(tipoInfraccion: string) {
    this.agregarActividad(
      'reporte_creado',
      `Se creó un nuevo reporte de: ${tipoInfraccion}`,
      'Mis Reportes',
      'fa-solid fa-plus-circle',
      '#10b981'
    );
  }

  registrarEdicionReporte(idReporte: number) {
    this.agregarActividad(
      'reporte_editado',
      `Se editó el reporte #${idReporte}`,
      'Mis Reportes',
      'fa-solid fa-pen-to-square',
      '#3b82f6'
    );
  }

  registrarEliminacionReporte(idReporte: number) {
    this.agregarActividad(
      'reporte_eliminado',
      `Se eliminó el reporte #${idReporte}`,
      'Mis Reportes',
      'fa-solid fa-trash',
      '#ef4444'
    );
  }

  registrarInicioSesion() {
    this.agregarActividad(
      'inicio_sesion',
      'Se inició sesión en la aplicación',
      'Autenticación',
      'fa-solid fa-right-to-bracket',
      '#1e3a8a'
    );
  }

  registrarCierreSesion() {
    this.agregarActividad(
      'cierre_sesion',
      'Se cerró sesión en la aplicación',
      'Autenticación',
      'fa-solid fa-right-from-bracket',
      '#64748b'
    );
  }

  registrarActualizacionPerfil() {
    this.agregarActividad(
      'perfil_actualizado',
      'Se actualizó la información del perfil',
      'Perfil',
      'fa-solid fa-user-pen',
      '#8b5cf6'
    );
  }

  registrarCambioAvatar() {
    this.agregarActividad(
      'avatar_cambiado',
      'Se cambió la foto de perfil',
      'Perfil',
      'fa-solid fa-camera',
      '#ec4899'
    );
  }

  registrarAccesoModulo(modulo: string) {
    this.agregarActividad(
      'acceso_modulo',
      `Accedió al módulo: ${modulo}`,
      modulo,
      'fa-solid fa-folder-open',
      '#f59e0b'
    );
  }

  obtenerActividades(): ActividadReciente[] {
    return this.actividadesSubject.value;
  }

  limpiarActividades() {
    const userId = this.getUserId();
    if (!userId) return;
    
    const key = `${this.STORAGE_KEY}_${userId}`;
    localStorage.removeItem(key);
    this.actividadesSubject.next([]);
  }

  // Verificar si es ciudadano
  esCiudadano(): boolean {
    const role = localStorage.getItem('role');
    return role === 'CIUDADANO' || role === 'CITIZEN' || !role;
  }
}
