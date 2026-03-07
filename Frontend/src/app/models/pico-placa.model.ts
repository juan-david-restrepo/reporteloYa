// src/app/models/pico-placa.model.ts

export interface PicoPlacaDia {
  diaSemana: string;      // Ejemplo: 'Lunes'
  restriccion: string;    // Ejemplo: '6 y 7'
  observacion?: string;   // Campo opcional para notas
}