import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, UpperCasePipe } from '@angular/common';
import { SenalesService, Senal } from './senales.service';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';

@Component({
  selector: 'app-senales',
  standalone: true,
  imports: [CommonModule, NgFor, UpperCasePipe, Nav, Footer],
  templateUrl: './senales.html',
  styleUrls: ['./senales.css']
})
export class SenalesComponent implements OnInit {

  senales: Senal[] = [];
  tipos: string[] = ['reglamentarias', 'preventivas', 'informativas', 'transitorias'];

  // Objeto donde guardamos las señales filtradas por tipo
  senalesPorTipo: { [tipo: string]: Senal[] } = {};

  loading = true;
  error = '';

  // Paginación por tipo
  pageSize = 14; // máximo 10 por página
  currentPage: { [tipo: string]: number } = {};

  constructor(private senalesService: SenalesService) {}

  ngOnInit(): void {
    // Inicializar página actual y arreglos
    this.tipos.forEach(tipo => {
      this.currentPage[tipo] = 0;
      this.senalesPorTipo[tipo] = [];
    });

    this.senalesService.obtenerSenales().subscribe({
      next: data => {
        this.senales = data;

        // Filtrar según la inicial de cada señal
        this.senales.forEach(s => {
          const inicial = s.nombre.split('_')[0].toUpperCase(); // SR, SP, SI, ST...
          if (inicial.startsWith('SR')) this.senalesPorTipo['reglamentarias'].push(s);
          else if (inicial.startsWith('SP')) this.senalesPorTipo['preventivas'].push(s);
          else if (inicial.startsWith('SI')) this.senalesPorTipo['informativas'].push(s);
          else this.senalesPorTipo['transitorias'].push(s); // todo lo demás
        });

        this.loading = false;
      },
      error: err => {
        console.error('Error al cargar señales:', err);
        this.error = 'No se pudieron cargar las señales';
        this.loading = false;
      }
    });
  }

  // Retorna las señales visibles según la página
  getPorTipo(tipo: string): Senal[] {
    const start = this.currentPage[tipo] * this.pageSize;
    return this.senalesPorTipo[tipo].slice(start, start + this.pageSize);
  }

  totalPages(tipo: string): number {
    return Math.ceil(this.senalesPorTipo[tipo].length / this.pageSize);
  }

  changePage(tipo: string, page: number): void {
    if (page >= 0 && page < this.totalPages(tipo)) {
      this.currentPage[tipo] = page;
    }
  }
}