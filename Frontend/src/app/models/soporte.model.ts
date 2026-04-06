export interface TicketSoporte {
  id: number;
  titulo: string;
  descripcion: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA';
  estado: 'ABIERTO' | 'EN_PROCESO' | 'CERRADO';
  nombreUsuario: string;
  usuarioId: number;
  cantidadMensajes: number;
  ultimoMensaje?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface MensajeSoporte {
  id: number;
  ticketId: number;
  emisorNombre: string;
  contenido: string;
  esAdmin: boolean;
  leido: boolean;
  fechaEnvio: string;
}

export interface TicketDetalle extends TicketSoporte {
  mensajes: MensajeSoporte[];
}

export interface CrearTicketRequest {
  titulo: string;
  descripcion: string;
  prioridad?: string;
}

export interface ResponderTicketRequest {
  contenido: string;
}

export interface ContadorTickets {
  abiertos: number;
  enProceso: number;
  cerrados: number;
}

export interface NotificacionSoporte {
  tipo: string;
  ticketId: number;
  titulo: string;
  mensaje: string;
  fecha: string;
}
