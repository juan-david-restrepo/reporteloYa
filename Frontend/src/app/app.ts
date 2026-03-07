import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScrollTopComponent } from './scroll-top/scroll-top';
import { IdleService } from './service/idle.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ScrollTopComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('y');


    showIdleModal = false;

  // 👇 AQUÍ es donde va el constructor
  constructor(private idleService: IdleService) {}

  // ngOnInit se ejecuta cuando arranca la app
  ngOnInit() {
    this.idleService.startWatching(() => {
      // esto se ejecuta después de 10 min sin actividad
      this.showIdleModal = true;
    }); 
  }
}
