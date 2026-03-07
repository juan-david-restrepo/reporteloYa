import * as AOS from 'aos';
import 'aos/dist/aos.css';
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';
import { interval, Subscription } from 'rxjs';
import { NoticiasComponent } from '../noticias/noticias';
import { AuthService } from '../../service/auth.service';

type ModuleKey = 'subir-reporte' | 'multas' | 'pico-placa' | 'parking';

interface Module {
  title: string;
  description: string;
  image?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, Nav, Footer, RouterModule, NoticiasComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home implements OnInit, OnDestroy, AfterViewInit {
  /* ------------------------------------------
     Modal de módulos
  ------------------------------------------- */
  isModalOpen = false;
  isLoggedIn = false; // Simulación de estado de autenticación
  selectedModule: Module | null = null;

  modulesData: Record<ModuleKey, Module> = {
    'subir-reporte': {
      title: 'Reporta una Foto Multa',
      description:
        'Sube evidencias de infracciones y contribuye a mejorar la movilidad en tu ciudad.',
      image: 'assets/images/foto_multaslegales_carroya.webp',
    },
    multas: {
      title: 'Consulta tus Multas',
      description:
        'Revisa fácilmente el estado de tus infracciones de tránsito.',
      image: 'assets/images/multas-de-transito.webp',
    },
    'pico-placa': {
      title: 'Consulta del Pico y Placa',
      description:
        'Conoce las restricciones vehiculares vigentes para tu zona.',
      image: 'assets/images/Captura de pantalla 2025-11-13 195849.png',
    },
    parking: {
      title: 'Localización de Parqueaderos',
      description:
        'Encuentra los parqueaderos más cercanos y sus horarios de atención.',
      image: 'assets/images/120180114105953.jpg',
    },
  };

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  openModal(moduleKey: ModuleKey) {
    if (!this.isLoggedIn) {
      this.selectedModule = this.modulesData[moduleKey];
      this.isModalOpen = true;
    } else {
      this.router.navigate([`/${moduleKey}`]);
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }

  redirectToLogin() {
    this.router.navigate(['/login']);
  }

  /* ------------------------------------------
     Carrusel de SECCIONES (información inferior)
  ------------------------------------------- */

  sections: string[] = [
    'infracciones',
    'informacionVial',
    'integracion',
    'notificaciones',
  ];

  selectedSection = this.sections[0];
  currentIndex = 0;

  private sectionTimer?: Subscription;
  private readonly SECTION_INTERVAL = 5000;

  startCarousel() {
    this.sectionTimer = interval(this.SECTION_INTERVAL).subscribe(() => {
      this.nextSection();
    });
  }

  stopCarousel() {
    this.sectionTimer?.unsubscribe();
  }

  nextSection() {
    this.currentIndex = (this.currentIndex + 1) % this.sections.length;
    this.selectedSection = this.sections[this.currentIndex];
  }

  selectSection(section: string) {
    this.selectedSection = section;
    this.currentIndex = this.sections.indexOf(section);
  }

  /* ------------------------------------------
     Carrusel del HEADER (principal)
  ------------------------------------------- */

  headerIndex = 0;

  headerSlides = [
    {
      image: 'assets/images/principal.png',
      text: `"La seguridad vial empieza contigo.<br> 
              Reporta, participa, mejora tu ciudad."`,
      buttonText: 'Ver estadísticas',
      buttonLink: '/estadisticas',
    },
    {
      image: 'assets/images/secundario.png',
      text: `"Reporta infracciones fácilmente.<br>
              Solo sube una foto o video."`,
      buttonText: 'Subir reporte',
      buttonLink: '/subir-reporte',
    },
    {
      image: 'assets/images/Armenia.webp',
      text: `"Mejora tu ciudad.<br>
              Cada reporte cuenta."`,
      buttonText: 'Ver estadísticas',
      buttonLink: '/estadisticas',
    },
  ];

  private headerTimer?: Subscription;
  private readonly HEADER_INTERVAL = 10000;

  nextSlide() {
    this.headerIndex = (this.headerIndex + 1) % this.headerSlides.length;
  }

  prevSlide() {
    this.headerIndex =
      (this.headerIndex - 1 + this.headerSlides.length) %
      this.headerSlides.length;
  }

  startHeaderCarousel() {
    this.headerTimer = interval(this.HEADER_INTERVAL).subscribe(() => {
      this.nextSlide();
    });
  }

  stopHeaderCarousel() {
    this.headerTimer?.unsubscribe();
  }

  /* ------------------------------------------
     Ciclo de vida Angular
  ------------------------------------------- */

  ngOnInit() {
    this.authService.authState$.subscribe((state) => {
      this.isLoggedIn = state;
    });
    this.startCarousel();
    this.startHeaderCarousel();
  }

  ngOnDestroy() {
    this.stopCarousel();
    this.stopHeaderCarousel();
  }

  ngAfterViewInit() {
    const accordions = document.querySelectorAll('.accordion');

    accordions.forEach((acc) => {
      acc.addEventListener('click', () => {
        const isActive = acc.classList.contains('active');

        // Cerrar todos
        accordions.forEach((a) => a.classList.remove('active'));

        // Abrir el seleccionado
        if (!isActive) acc.classList.add('active');
      });
    });

    AOS.init({
      duration: 1100, // duración de la animación
      once: true, // solo animar la primera vez
    });

    // Opcional: recalcular si hay contenido dinámico
    AOS.refresh();
  }
}
