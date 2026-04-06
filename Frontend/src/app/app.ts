import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScrollTopComponent } from './scroll-top/scroll-top';
import { IdleService } from './service/idle.service';
import { CommonModule } from '@angular/common';
import { FloatingActionsComponent } from './shared/floating-actions/floating-actions';
import { SplashScreenComponent } from './splash-screen/splash-screen.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ScrollTopComponent, CommonModule, FloatingActionsComponent, SplashScreenComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('y');


  showIdleModal = false;
  showSplash = false;
  private splashCompleteHandler = this.onSplashComplete.bind(this);

  // 👇 AQUÍ es donde va el constructor
  constructor(private idleService: IdleService) {}

  // ngOnInit se ejecuta cuando arranca la app
  ngOnInit() {
    this.idleService.startWatching(() => {
      // esto se ejecuta después de 10 min sin actividad
      this.showIdleModal = true;
    }); 

    const splashStatus = sessionStorage.getItem('splashShown');
    if (splashStatus !== 'true') {
      this.showSplash = true;
      window.addEventListener('splashComplete', this.splashCompleteHandler);
    }
  }

  ngOnDestroy() {
    window.removeEventListener('splashComplete', this.splashCompleteHandler);
  }

  private onSplashComplete() {
    this.showSplash = false;
    sessionStorage.setItem('splashShown', 'true');
  }

  
}
