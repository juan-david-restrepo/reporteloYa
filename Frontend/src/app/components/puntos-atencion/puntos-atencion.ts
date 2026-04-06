import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';
import { SafeUrlPipe } from '../../shared/pipe/safe-url.pipe';

interface PuntoAtencion {
  id: number;
  nombre: string;
  tipo: 'municipal' | 'departamental' | 'auxiliar';
  direccion: string;
  barrio: string;
  ciudad: string;
  telefono: string;
  telefonos?: string[];
  horarios: {
    dias: string;
    hora: string;
  }[];
  servicios: string[];
  coordenadas: string;
  esPrincipal: boolean;
  nota?: string;
}

@Component({
  selector: 'app-puntos-atencion',
  standalone: true,
  imports: [CommonModule, Nav, Footer, SafeUrlPipe],
  templateUrl: './puntos-atencion.html',
  styleUrls: ['./puntos-atencion.css']
})
export class PuntosAtencion {
  puntos: PuntoAtencion[] = [
    {
      id: 1,
      nombre: 'SETTA - Secretaría de Tránsito y Transporte de Armenia',
      tipo: 'municipal',
      direccion: 'Plaza Minorista',
      barrio: 'San José',
      ciudad: 'Armenia, Quindío',
      telefono: '(606) 3202816013',
      telefonos: ['320 281 6013 (Citas)', '(606) 746 1234'],
      horarios: [
        { dias: 'Lunes a Viernes', hora: '8:00 AM - 12:00 PM y 2:00 PM - 5:30 PM' }
      ],
      servicios: ['Licencias de conducción', 'Trámites de vehículos', 'Comparendos', 'Siniestralidad', 'Educación vial', 'Gestiones administrativas'],
      coordenadas: '4.5269,-75.6813',
      esPrincipal: true,
      nota: 'Sede única con 13 ventanillas habilitadas. Antigua sede de La Estación ya no opera.'
    },
    {
      id: 2,
      nombre: 'Instituto Departamental de Tránsito del Quindío - IDTQ',
      tipo: 'departamental',
      direccion: 'Kilómetro 1 Vía Armenia - Circasia',
      barrio: 'La Cabaña',
      ciudad: 'Circasia, Quindío',
      telefono: '(+57) 318 206 42 25',
      telefonos: [
        'Dirección General: 318 206 42 25',
        'Trámites: 317 654 94 46',
        'Información: 315 665 03 79',
        'CEA: 300 524 68 14'
      ],
      horarios: [
        { dias: 'Lunes a Viernes - Atención General', hora: '7:30 AM - 12:00 PM y 1:30 PM - 5:00 PM' },
        { dias: 'Lunes a Viernes - Trámites', hora: '7:30 AM - 11:30 AM y 1:30 PM - 4:30 PM' }
      ],
      servicios: ['Trámites departamentales', 'Licencias', 'Vehículos', 'Centro de Enseñanza Automovilística', 'Comparendos'],
      coordenadas: '4.6166,-75.7833',
      esPrincipal: false,
      nota: 'Sede departamental. Atención para trámites fuera del perímetro urbano de Armenia.'
    },
    {
      id: 3,
      nombre: 'Punto de Atención La Estradita',
      tipo: 'auxiliar',
      direccion: 'Carrera 15 # 12-89, Local 145',
      barrio: 'La Estradita',
      ciudad: 'Armenia, Quindío',
      telefono: '(606) 746 9012',
      horarios: [
        { dias: 'Lunes a Sábado', hora: '9:00 AM - 8:00 PM' },
        { dias: 'Domingos y Festivos', hora: '10:00 AM - 6:00 PM' }
      ],
      servicios: ['Pagos', 'Información', 'Certificados'],
      coordenadas: '4.5320,-75.6780',
      esPrincipal: false
    },
    {
      id: 4,
      nombre: 'Punto de Atención Norte',
      tipo: 'auxiliar',
      direccion: 'Calle 50 # 14-22',
      barrio: 'Bosques de Santa Clara',
      ciudad: 'Armenia, Quindío',
      telefono: '(606) 746 3456',
      horarios: [
        { dias: 'Lunes a Viernes', hora: '7:00 AM - 4:00 PM' }
      ],
      servicios: ['Comparendos', 'Licencias', 'Cursos'],
      coordenadas: '4.5450,-75.6700',
      esPrincipal: false
    }
  ];

  puntoExpandido: number | null = null;

  toggleExpand(id: number) {
    this.puntoExpandido = this.puntoExpandido === id ? null : id;
  }

  getGoogleMapsUrl(coordenadas: string): string {
    return `https://www.google.com/maps?q=${coordenadas}&output=embed`;
  }

  getTipoBadgeClass(tipo: string): string {
    return `badge-${tipo}`;
  }

  getTipoLabel(tipo: string): string {
    switch(tipo) {
      case 'municipal': return 'Municipal';
      case 'departamental': return 'Departamental';
      case 'auxiliar': return 'Punto Auxiliar';
      default: return '';
    }
  }
}
