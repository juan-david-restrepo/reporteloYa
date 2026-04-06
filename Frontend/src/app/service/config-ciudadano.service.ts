import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfigCiudadano {
  modoNoche: boolean;
  daltonismo: boolean;
  fontSize: number;
}

const STORAGE_KEY = 'ciudadano_config';

@Injectable({ providedIn: 'root' })
export class ConfigCiudadanoService {
  private configSubject = new BehaviorSubject<ConfigCiudadano>({
    modoNoche: false,
    daltonismo: false,
    fontSize: 16
  });

  config$ = this.configSubject.asObservable();

  constructor() {
    this.cargarDesdeStorage();
  }

  private cargarDesdeStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const config = JSON.parse(stored) as ConfigCiudadano;
        this.configSubject.next(config);
        this.aplicarEstilos(config);
      } catch {
        console.error('🔧 ConfigCiudadanoService: Error al parsear config');
      }
    }
  }

  private guardarEnStorage(config: ConfigCiudadano) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  getConfig(): ConfigCiudadano {
    return this.configSubject.value;
  }

  getConfigObservable() {
    return this.config$;
  }

  actualizarModoNoche(enabled: boolean) {
    const config = { ...this.configSubject.value, modoNoche: enabled };
    this.configSubject.next(config);
    this.guardarEnStorage(config);
    this.aplicarEstilos(config);
  }

  actualizarDaltonismo(enabled: boolean) {
    const config = { ...this.configSubject.value, daltonismo: enabled };
    this.configSubject.next(config);
    this.guardarEnStorage(config);
    this.aplicarEstilos(config);
  }

  actualizarFontSize(size: number) {
    const config = { ...this.configSubject.value, fontSize: size };
    this.configSubject.next(config);
    this.guardarEnStorage(config);
    this.aplicarEstilos(config);
  }

  aplicarEstilos(config?: ConfigCiudadano) {
    const c = config || this.configSubject.value;

    if (c.modoNoche) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    if (c.daltonismo) {
      document.body.classList.add('cb-mode');
    } else {
      document.body.classList.remove('cb-mode');
    }

    document.body.style.fontSize = `${c.fontSize}px`;
  }
}