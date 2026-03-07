import { NgIf } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-scroll-top',
  standalone: true,
  imports: [NgIf],
  templateUrl: './scroll-top.html',
  styleUrls: ['./scroll-top.css']
})
export class ScrollTopComponent implements OnInit {
  isVisible = false;
  showOnHome = false; // Flag para saber si estamos en Home

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Verifica si la ruta actual es '' o 'home'
        this.showOnHome = event.urlAfterRedirects === '/' || event.urlAfterRedirects === '/home';

        // Hacemos scroll al top cuando cambiamos de ruta
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Ocultamos el botón si no estamos en Home
        if (!this.showOnHome) {
          this.isVisible = false;
        }
      });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Solo mostramos el botón si estamos en Home y scroll > 200px
    this.isVisible = this.showOnHome && window.scrollY > 200;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
