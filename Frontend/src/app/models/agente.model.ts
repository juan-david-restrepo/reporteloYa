export interface Agente {
  id: number;
  placa: string;
  nombre: string;        // ✅ así llega del AdminAgenteDTO
  documento: string;     // ✅ así llega del AdminAgenteDTO
  estado: 'DISPONIBLE' | 'OCUPADO' | 'FUERA_SERVICIO';
  telefono: string;
  foto?: string;
  promedioResenas: number;
}