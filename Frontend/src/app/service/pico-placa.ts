import { Injectable } from '@angular/core';
import { PicoPlacaDia } from '../models/pico-placa.model';

@Injectable({
  providedIn: 'root'
})

export class PicoPlacaService {
    private data: PicoPlacaDia[] = [
    { diaSemana: 'Lunes', restriccion: '5 y 6' },
    { diaSemana: 'Martes', restriccion: '7 y 8' },
    { diaSemana: 'Miércoles', restriccion: '9 y 0' },
    { diaSemana: 'Jueves', restriccion: '1 y 2' },
    { diaSemana: 'Viernes', restriccion: '3 y 4' },
    { diaSemana: 'Sábado', restriccion: 'No aplica' },
    { diaSemana: 'Domingo', restriccion: 'No aplica' }
  ];

  constructor() { }

  getRestricciones(): PicoPlacaDia[] {
    return this.data;
  }
}
