import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import * as AOS from 'aos';
import 'aos/dist/aos.css';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';

@Component({
  selector: 'app-aviso-privacidad',
  standalone: true,
  imports: [CommonModule, RouterModule, Nav, Footer],
  templateUrl: './aviso-privacidad.html',
  styleUrls: ['./aviso-privacidad.css'],
})
export class AvisoPrivacidad implements OnInit, AfterViewInit {
  currentYear = new Date().getFullYear();

  ngOnInit() {}

  ngAfterViewInit() {
    AOS.init({
      duration: 800,
      once: true,
      easing: 'ease-out-cubic',
    });
    AOS.refresh();
  }
}
