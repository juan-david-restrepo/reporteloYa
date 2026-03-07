export interface Agente {
  id: number;
  placa: string;
  nombre: string;
  estado: 'DISPONIBLE' | 'OCUPADO' | 'AUSENTE';
  telefono: string;
  documento: string; // 👈 AÑADIDO
  foto?: string;
  promedioResenas: number;
}
