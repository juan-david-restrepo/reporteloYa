export interface Agente {
  id: number;
  placa: string;
  
  // Campos propios de Agentes
  nombre: string;           // si el backend lo retorna como 'nombre'
  documento: string;        // si el backend lo retorna como 'documento'
  
  // Campos heredados de Usuario
  nombreCompleto: string;   // viene de Usuario
  numeroDocumento: string;  // viene de Usuario
  
  estado: 'DISPONIBLE' | 'OCUPADO' | 'AUSENTE';
  telefono: string;
  email?: string;
  foto?: string;
  promedioResenas: number;
}