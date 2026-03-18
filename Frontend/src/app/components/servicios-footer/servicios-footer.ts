import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import * as AOS from 'aos';
import 'aos/dist/aos.css';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';

interface Servicio {
  id: string;
  titulo: string;
  descripcion: string;
  icon: string;
  color: string;
  caracteristicas: string[];
}

@Component({
  selector: 'app-servicios-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, Nav, Footer],
  templateUrl: './servicios-footer.html',
  styleUrls: ['./servicios-footer.css'],
})
export class ServiciosFooter implements OnInit, AfterViewInit {
  servicios: Servicio[] = [
    {
      id: 'infracciones',
      titulo: 'Infracciones',
      descripcion: 'Gestiona y consulta las infracciones de tránsito en tiempo real. Reporta conductores infractores y mantente informado sobre el estado de tus propias infracciones.',
      icon: 'fa-solid fa-file-invoice-dollar',
      color: '#dc2626',
      caracteristicas: [
        'Reporte en línea de infracciones',
        'Consulta de multas pendientes',
        'Historial de sanciones',
        'Notificaciones automáticas'
      ]
    },
    {
      id: 'informacion-vial',
      titulo: 'Información Vial',
      descripcion: 'Accede a información actualizada sobre el estado de las vías, cierres carreteros, desvíos y normativas de tránsito vigentes en el Quindío.',
      icon: 'fa-solid fa-road',
      color: '#2563eb',
      caracteristicas: [
        'Estado de vías en tiempo real',
        'Cierres y desvíos',
        'Normativas vigentes',
        'Mapa de zonas de riesgo'
      ]
    },
    {
      id: 'alertas',
      titulo: 'Alertas',
      descripcion: 'Recibe alertas inmediatas sobre accidentes, operativos de tránsito, cambios en restricciones vial y toda la información relevante para tu movilidad.',
      icon: 'fa-solid fa-bell',
      color: '#f59e0b',
      caracteristicas: [
        'Alertas en tiempo real',
        'Notificaciones push',
        'Alertas personalizadas por zona',
        'Historial de notificaciones'
      ]
    }
  ];

  activeService: string = 'infracciones';

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.fragment.subscribe(fragment => {
      if (fragment && this.servicios.some(s => s.id === fragment)) {
        this.activeService = fragment;
        setTimeout(() => AOS.refresh(), 100);
      }
    });
  }

  ngAfterViewInit() {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out-cubic',
    });
    AOS.refresh();
  }

  setActiveService(serviceId: string) {
    this.activeService = serviceId;
    setTimeout(() => {
      AOS.refresh();
    }, 100);
  }

  goToService(route: string) {
    switch(route) {
      case 'infracciones':
        window.location.href = '/multas';
        break;
      case 'informacion-vial':
        window.location.href = '/pico-placa';
        break;
      case 'alertas':
        window.location.href = '/noticias';
        break;
    }
  }

  getActiveServiceData(): Servicio | undefined {
    return this.servicios.find(s => s.id === this.activeService);
  }
}
