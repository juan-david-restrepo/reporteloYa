import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root' // disponible en toda la app
})
export class IdleService {

  private timeoutId: any;

  // 10 minutos
  private readonly IDLE_TIME = 10 * 60 * 1000;

  startWatching(onIdle: () => void) {

    // arrancamos el temporizador
    this.resetTimer(onIdle);

    // eventos que cuentan como actividad apa que pues el usuario los mueva o algo
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, () => {
        this.resetTimer(onIdle);
      });
    });
  }

  private resetTimer(onIdle: () => void) {
    clearTimeout(this.timeoutId);

    this.timeoutId = setTimeout(() => {
      onIdle(); // usuario inactivo
    }, this.IDLE_TIME);
  }
}