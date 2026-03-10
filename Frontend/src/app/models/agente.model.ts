export interface Agente {
  id: number;
  placa: string;
  nombreCompleto: string;
  estado: 'DISPONIBLE' | 'OCUPADO' | 'FUERA DE SERVICI';
  telefono: string;
  numeroDocumento: string; // 👈 AÑADIDO
  foto?: string;
  promedioResenas: number;
}
