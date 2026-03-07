import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoticiasService } from './noticias.service';

@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './noticias.html',
  styleUrls: ['./noticias.css']
})
export class NoticiasComponent implements OnInit {

  noticias: any[] = [];
  noticiaSeleccionada: any = null;
  paginaActual = 1;

  startMap: Record<number, number> = {
    1: 0,
    2: 12,
    3: 24,
    4: 36,
    5: 48
  };

  constructor(private noticiasService: NoticiasService) {}

  ngOnInit() {
    this.cargarNoticias(1);
  }

  cargarNoticias(pagina: number) {
    this.paginaActual = pagina;
    const start = this.startMap[pagina] ?? 0;

    this.noticiasService.obtenerNoticias(start)
      .subscribe(data => {
        this.noticias = data;
        console.log('Noticias cargadas:', data);
      });
  }

  siguiente() {
    if (this.paginaActual < 5) this.cargarNoticias(this.paginaActual + 1);
  }

  anterior() {
    if (this.paginaActual > 1) this.cargarNoticias(this.paginaActual - 1);
  }

  verDetalle(index: number) {
    this.noticiaSeleccionada = this.noticias[index];
  }

  volver() {
    this.noticiaSeleccionada = null;
  }
}