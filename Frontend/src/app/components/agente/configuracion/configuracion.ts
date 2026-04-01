import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, HostBinding } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Config {
  modoNoche: boolean;
  daltonismo: boolean;
  fontSize: number;
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css',
})
export class Configuracion {

  @Input() set config(value: Config | undefined) {
    if (value) {
      this._config = value;
    } else {
      this._loadFromStorage();
    }
  }

  @Output() configChange = new EventEmitter<Config>();

  private _config: Config = { modoNoche: false, daltonismo: false, fontSize: 16 };
  
  get config(): Config {
    return this._config;
  }

  @HostBinding('class.dark') get isDark(): boolean {
    return this._config.modoNoche;
  }

  @HostBinding('class.cb') get isDaltonismo(): boolean {
    return this._config.daltonismo;
  }

  constructor() {
    this._loadFromStorage();
  }

  private _loadFromStorage() {
    const stored = localStorage.getItem('ciudadano_config');
    if (stored) {
      try {
        this._config = JSON.parse(stored);
      } catch {
        this._config = { modoNoche: false, daltonismo: false, fontSize: 16 };
      }
    }
  }

  update() {
    localStorage.setItem('ciudadano_config', JSON.stringify(this._config));
    this.configChange.emit(this._config);
  }

}