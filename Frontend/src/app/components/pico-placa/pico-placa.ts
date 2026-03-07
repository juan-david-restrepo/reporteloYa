import { Component,  OnInit, inject } from '@angular/core';
import { PicoPlacaDia } from '../../models/pico-placa.model';
import { PicoPlacaService } from '../../service/pico-placa';
import { CommonModule } from '@angular/common';
import { Footer } from '../../shared/footer/footer';
import { Nav } from '../../shared/nav/nav';

@Component({
  selector: 'app-pico-placa',
  imports: [Nav, CommonModule, Footer],
  templateUrl: './pico-placa.html',
  styleUrl: './pico-placa.css'
})
export class PicoPlaca {
private picoPlacaService = inject(PicoPlacaService);
  
  restricciones: PicoPlacaDia[] = [];
  restriccionHoy: PicoPlacaDia | undefined;
  diaActual: string = '';

  ngOnInit(): void {
    this.restricciones = this.picoPlacaService.getRestricciones();
    this.establecerDiaActual();
  }

  establecerDiaActual(): void {
    const today = new Date();
    
    // Obtener el nombre del día en español (ej. "martes")
    const diaHoyLower = today.toLocaleDateString('es-CO', { weekday: 'long' });
    
    // Convertir la primera letra a mayúscula (ej. "Martes") para coincidir con los datos del servicio
    this.diaActual = diaHoyLower.charAt(0).toUpperCase() + diaHoyLower.slice(1);

    // Encontrar la restricción para el día actual
    this.restriccionHoy = this.restricciones.find(d => d.diaSemana === this.diaActual);
  }
}
