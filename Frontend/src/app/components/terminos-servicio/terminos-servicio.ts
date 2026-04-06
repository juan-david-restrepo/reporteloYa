import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import * as AOS from 'aos';
import 'aos/dist/aos.css';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';

@Component({
  selector: 'app-terminos-servicio',
  standalone: true,
  imports: [CommonModule, RouterModule, Nav, Footer],
  templateUrl: './terminos-servicio.html',
  styleUrls: ['./terminos-servicio.css'],
})
export class TerminosServicio implements OnInit, AfterViewInit {
  activeSection: string = 'introduccion';

  secciones = [
    { id: 'introduccion', titulo: 'Introducción', icono: 'fa-solid fa-info-circle' },
    { id: 'aceptacion', titulo: 'Aceptación de Términos', icono: 'fa-solid fa-handshake' },
    { id: 'uso', titulo: 'Uso de la Plataforma', icono: 'fa-solid fa-laptop' },
    { id: 'cuenta', titulo: 'Cuenta de Usuario', icono: 'fa-solid fa-user-circle' },
    { id: 'reportes', titulo: 'Reportes e Incidentes', icono: 'fa-solid fa-exclamation-circle' },
    { id: 'conducta', titulo: 'Conducta del Usuario', icono: 'fa-solid fa-gavel' },
    { id: 'propiedad', titulo: 'Propiedad Intelectual', icono: 'fa-solid fa-copyright' },
    { id: 'limitacion', titulo: 'Limitación de Responsabilidad', icono: 'fa-solid fa-shield-halved' },
    { id: 'modificaciones', titulo: 'Modificaciones', icono: 'fa-solid fa-pen-to-square' },
    { id: 'contacto', titulo: 'Contacto', icono: 'fa-solid fa-envelope' },
  ];

  ngOnInit() {
    this.routeFragment();
  }

  ngAfterViewInit() {
    AOS.init({
      duration: 800,
      once: true,
      easing: 'ease-out-cubic',
    });
    AOS.refresh();
  }

  routeFragment() {
    const hash = window.location.hash.replace('#', '');
    if (this.secciones.find(s => s.id === hash)) {
      this.activeSection = hash;
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  scrollToSection(sectionId: string) {
    this.activeSection = sectionId;
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        AOS.refresh();
      }
    }, 100);
  }
}
