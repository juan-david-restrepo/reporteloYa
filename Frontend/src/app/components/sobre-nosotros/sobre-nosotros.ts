import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import * as AOS from 'aos';
import 'aos/dist/aos.css';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';

@Component({
  selector: 'app-sobre-nosotros',
  standalone: true,
  imports: [CommonModule, RouterModule, Nav, Footer],
  templateUrl: './sobre-nosotros.html',
  styleUrls: ['./sobre-nosotros.css'],
})
export class SobreNosotros implements OnInit, AfterViewInit {
  activeTab: 'mision' | 'vision' | 'equipo' = 'mision';

  equipo = [
    { nombre: 'Nombre 1', rol: 'Líder de Proyecto', imagen: 'assets/images/equipo1.jpg' },
    { nombre: 'Nombre 2', rol: 'Desarrollador Full Stack', imagen: 'assets/images/equipo2.jpg' },
    { nombre: 'Nombre 3', rol: 'Diseñador UI/UX', imagen: 'assets/images/equipo3.jpg' },
    { nombre: 'Nombre 4', rol: 'Analista de Datos', imagen: 'assets/images/equipo4.jpg' },
    { nombre: 'Nombre 5', rol: 'Especialista en Seguridad', imagen: 'assets/images/equipo5.jpg' },
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'mision' || fragment === 'vision' || fragment === 'equipo') {
        this.activeTab = fragment;
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

  setActiveTab(tab: 'mision' | 'vision' | 'equipo') {
    this.activeTab = tab;
    setTimeout(() => {
      AOS.refresh();
    }, 100);
  }
}
