import { Component, OnInit, inject } from '@angular/core';
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
  horaActual: string = '';
  isAnimating: boolean = false;

  private diasOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  ngOnInit(): void {
    this.restricciones = this.picoPlacaService.getRestricciones();
    this.establecerDiaActual();
    this.actualizarHora();
    setInterval(() => this.actualizarHora(), 60000);
  }

  establecerDiaActual(): void {
    const today = new Date();
    const diaHoyLower = today.toLocaleDateString('es-CO', { weekday: 'long' });
    this.diaActual = diaHoyLower.charAt(0).toUpperCase() + diaHoyLower.slice(1);
    this.restriccionHoy = this.restricciones.find(d => d.diaSemana === this.diaActual);
    this.triggerAnimation();
  }

  actualizarHora(): void {
    const now = new Date();
    this.horaActual = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  triggerAnimation(): void {
    this.isAnimating = true;
    setTimeout(() => this.isAnimating = false, 2000);
  }

  getDayIcon(dia: string): string {
    const iconos: { [key: string]: string } = {
      'Lunes': 'fa-earth-americas',
      'Martes': 'fa-earth-americas',
      'Miércoles': 'fa-earth-americas',
      'Jueves': 'fa-earth-americas',
      'Viernes': 'fa-earth-americas',
      'Sábado': 'fa-umbrella-beach',
      'Domingo': 'fa-church'
    };
    return iconos[dia] || 'fa-calendar';
  }

  isPastDay(dia: string): boolean {
    const indiceDiaActual = this.diasOrden.indexOf(this.diaActual);
    const indiceDia = this.diasOrden.indexOf(dia);
    return indiceDia < indiceDiaActual;
  }
}