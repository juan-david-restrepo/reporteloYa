import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import * as AOS from 'aos';
import 'aos/dist/aos.css';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';

interface Pregunta {
  id: number;
  autor: string;
  pregunta: string;
  fecha: Date;
  respondida: boolean;
  respuesta?: string;
}

@Component({
  selector: 'app-preguntas-frecuentes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Nav, Footer],
  templateUrl: './preguntas-frecuentes.html',
  styleUrls: ['./preguntas-frecuentes.css'],
})
export class PreguntasFrecuentes implements OnInit, AfterViewInit {
  nombre: string = '';
  pregunta: string = '';
  preguntas: Pregunta[] = [
    {
      id: 1,
      autor: 'Carlos Martínez',
      pregunta: '¿Cómo puedo reportar una infracción de tránsito?',
      fecha: new Date('2025-01-15'),
      respondida: true,
      respuesta: 'Puedes reportar una infracción iniciando sesión en tu cuenta y dirigiéndote al módulo "Subir Reporte". Allí podrás subir una foto o video de la infracción con los detalles correspondientes.'
    },
    {
      id: 2,
      autor: 'María López',
      pregunta: '¿Cuál es el horario de atención del pico y placa en Armenia?',
      fecha: new Date('2025-02-10'),
      respondida: true,
      respuesta: 'El pico y placa en Armenia aplica de lunes a viernes de 7:00 AM a 7:00 PM, según el último dígito de tu placa.'
    },
    {
      id: 3,
      autor: 'Juan Pérez',
      pregunta: '¿Las multas reportadas tienen validez legal?',
      fecha: new Date('2025-03-05'),
      respondida: true,
      respuesta: 'Sí, todas las multas reportadas a través de nuestra plataforma son enviadas a las autoridades de tránsito correspondientes para su validación y gestión.'
    }
  ];
  preguntaEnviada: boolean = false;

  constructor() {}

  ngOnInit() {}

  ngAfterViewInit() {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out-cubic',
    });
    AOS.refresh();
  }

  enviarPregunta() {
    if (this.nombre.trim() && this.pregunta.trim()) {
      const nuevaPregunta: Pregunta = {
        id: this.preguntas.length + 1,
        autor: this.nombre.trim(),
        pregunta: this.pregunta.trim(),
        fecha: new Date(),
        respondida: false
      };
      
      this.preguntas.unshift(nuevaPregunta);
      
      this.preguntaEnviada = true;
      this.nombre = '';
      this.pregunta = '';
      
      setTimeout(() => {
        this.preguntaEnviada = false;
        AOS.refresh();
      }, 3000);

      setTimeout(() => {
        AOS.refresh();
      }, 100);
    }
  }

  formatFecha(date: Date): string {
    return new Date(date).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
