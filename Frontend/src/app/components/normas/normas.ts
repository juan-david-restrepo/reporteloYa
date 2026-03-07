import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Nav } from '../../shared/nav/nav';      // IMPORTAR NAV
import { Footer } from '../../shared/footer/footer'; // IMPORTAR FOOTER

@Component({
  selector: 'app-normas',
  standalone: true,
  imports: [Nav, Footer],   // AÑADIRLOS AQUÍ
  templateUrl: './normas.html',
  styleUrls: ['./normas.css']
})
export class Normas {

  constructor(private router: Router) {}

  volverInicio() {
    this.router.navigate(['/home']);
  }
}
