export interface Reporte {
  id: number;
  placaAgente: string;

  fecha: string; // yyyy-mm-dd
  hora: string;  // hh:mm

  ubicacion: string;
  tipoIncidente: string;

  descripcion: string;      // 👈 faltaba (qué hizo el agente)
  resenaCiudadano: string;  // 👈 sin ñ para evitar errores
}
