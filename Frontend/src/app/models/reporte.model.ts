export interface Reporte {
  id: number;
  placaAgente: string;
  fechaIncidente: Date; // yyyy-mm-dd
  horaIncidente: Date; // hh:mm
  ubicacion: string;
  tipoIncidente: string;
  descripcion: string; // 👈 faltaba (qué hizo el agente)
  resenaCiudadano: string;
  resumenOperativo?: string;
}
