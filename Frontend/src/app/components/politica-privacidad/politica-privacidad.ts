import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import * as AOS from 'aos';
import 'aos/dist/aos.css';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';

@Component({
  selector: 'app-politica-privacidad',
  standalone: true,
  imports: [CommonModule, RouterModule, Nav, Footer],
  templateUrl: './politica-privacidad.html',
  styleUrls: ['./politica-privacidad.css'],
})
export class PoliticaPrivacidad implements OnInit, AfterViewInit {
  activeSection: string = 'informacion';

  secciones = [
    { id: 'informacion', titulo: 'Información del Proyecto', icono: 'fa-solid fa-info-circle' },
    { id: 'finalidad', titulo: 'Finalidad del Tratamiento', icono: 'fa-solid fa-bullseye' },
    { id: 'tipos', titulo: 'Tipos de Datos', icono: 'fa-solid fa-database' },
    { id: 'legal', titulo: 'Base Legal', icono: 'fa-solid fa-gavel' },
    { id: 'seguridad', titulo: 'Almacenamiento y Seguridad', icono: 'fa-solid fa-shield-halved' },
    { id: 'acceso', titulo: 'Acceso y Actualización', icono: 'fa-solid fa-user-gear' },
    { id: 'transferencia', titulo: 'Transferencia de Datos', icono: 'fa-solid fa-share-nodes' },
    { id: 'riesgos', titulo: 'Riesgos y Controles', icono: 'fa-solid fa-triangle-exclamation' },
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
