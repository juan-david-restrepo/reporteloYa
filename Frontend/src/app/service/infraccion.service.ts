import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export type EstadoInfraccion =
  | 'PENDIENTE'
  | 'RECHAZADO'
  | 'EN PROCESO'
  | 'FINALIZADO';

export interface Infraccion {
  id: number;
  fecha: string;
  tipo: string;
  agente: string;
  placa: string;   // 🔥 agregado
  estado: EstadoInfraccion;
  ref: string;
}

@Injectable({
  providedIn: 'root'
})
export class InfraccionService {

  private infraccionesMock: Infraccion[] = [
    {
      id: 1,
      ref: 'INF-001',
      fecha: '2026-03-03',
      tipo: 'Exceso de velocidad',
      agente: 'Agente Martínez',
      placa: 'ABC-123',
      estado: 'PENDIENTE'
    },
    {
      id: 2,
      ref: 'INF-002',
      fecha: '2026-03-02',
      tipo: 'Vehículo mal estacionado',
      agente: 'Agente López',
      placa: 'XYZ-456',
      estado: 'FINALIZADO'
    },
    {
      id: 3,
      ref: 'INF-003',
      fecha: '2026-03-01',
      tipo: 'Semáforo dañado',
      agente: 'Agente Pérez',
      placa: 'LMN-789',
      estado: 'RECHAZADO'
    },
    {
      id: 4,
      ref: 'INF-004',
      fecha: '2026-02-28',
      tipo: 'Manejo errático',
      agente: 'Agente García',
      placa: 'QWE-321',
      estado: 'EN PROCESO'
    }
  ];

  constructor() {}

  getInfracciones(): Observable<Infraccion[]> {
    return of(this.infraccionesMock).pipe(
      delay(800)
    );
  }
}