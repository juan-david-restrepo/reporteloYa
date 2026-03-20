export interface Tarea { 
  titulo: string;
  id?: number;
  placaAgente: string;
  fecha: string;
  hora: string;
  descripcion: string;
  resumenOperativo?: string;
  estado: 'PENDIENTE' | 'EN PROCESO' | 'FINALIZADO' | 'RECHAZADO';
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA ';
}
