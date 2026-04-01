import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfigCiudadanoService, ConfigCiudadano } from '../../../service/config-ciudadano.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-configuracion-ciudadano',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './configuracion-ciudadano.html',
  styleUrl: './configuracion-ciudadano.css',
})
export class ConfiguracionCiudadano implements OnInit, OnDestroy {

  config: ConfigCiudadano = { modoNoche: false, daltonismo: false, fontSize: 16 };
  private subscription?: Subscription;

  @HostBinding('class.dark') get isDark(): boolean {
    return this.config.modoNoche;
  }

  @HostBinding('class.cb') get isDaltonismo(): boolean {
    return this.config.daltonismo;
  }

  constructor(private configService: ConfigCiudadanoService) {}

  ngOnInit() {
    this.subscription = this.configService.getConfigObservable().subscribe(config => {
      this.config = { ...config };
    });
    this.configService.aplicarEstilos();
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  updateModoNoche() {
    this.configService.actualizarModoNoche(this.config.modoNoche);
  }

  updateDaltonismo() {
    this.configService.actualizarDaltonismo(this.config.daltonismo);
  }

  updateFontSize() {
    this.configService.actualizarFontSize(this.config.fontSize);
  }

}