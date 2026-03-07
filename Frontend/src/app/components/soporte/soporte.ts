import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';

@Component({
  selector: 'app-soporte',
  standalone: true,
  templateUrl: './soporte.html',
  styleUrls: ['./soporte.css'],
  imports: [FormsModule, CommonModule, Nav, Footer]  // ✔ Correcto
})
export class Soporte {

  enviarSoporte() {
    console.log("Formulario enviado");
    alert("Tu solicitud de soporte ha sido enviada.");
  }

}
