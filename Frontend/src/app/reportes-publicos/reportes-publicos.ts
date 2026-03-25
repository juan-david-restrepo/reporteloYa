import { AfterViewInit, OnInit, OnDestroy, Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { ReportesService } from '../service/reportes.service';
import { WebsocketService } from '../service/websocket';


interface Reporte {
  id: number;
  tipo: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  fechaIncidente: Date;
  horaIncidente: Date;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADO';
  direccion?: string;
}

@Component({
  selector: 'app-reportes-publicos',
  standalone: true,
  templateUrl: './reportes-publicos.html',
  styleUrl: './reportes-publicos.css',
  imports: [CommonModule],
})
export class ReportesPublicos implements AfterViewInit, OnInit, OnDestroy {
  private map!: L.Map;
  private markersLayer = L.layerGroup();
  private socket?: WebSocket;
  private mapaListo = false;

  reportes: Reporte[] = [];

  tiposConteo: { tipo: string; cantidad: number; color: string }[] = [];

  private coloresPorTipo: { [key: string]: string } = {
    'ESTACIONAMIENTO_INCORRECTO': '#e74c3c',
    'ESTACIONAMIENTO': '#e74c3c',
    'SEMAFORO': '#f39c12',
    'PEATON': '#9b59b6',
    'PEATONES': '#9b59b6',
    'EXCESO_VELOCIDAD': '#3498db',
    'EXCESO_DE_VELOCIDAD': '#3498db',
    'OTROS': '#95a5a6',
    'default': '#95a5a6',
  };

  constructor(
    private zone: NgZone,
    private reportesService: ReportesService,
    private websocketService: WebsocketService,
  ) {}

  ngOnInit(): void {
    this.cargarReportesIniciales();

    this.websocketService.connect();

    this.websocketService.reportes$.subscribe((reporte) => {
      if (!reporte) return;

      const existe = this.reportes.find((r) => r.id === reporte.id);

      if (existe) {
        this.actualizarReporte(reporte);
      } else {
        this.agregarReporte(reporte);
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      setTimeout(() => this.map.invalidateSize(), 300);
    });
  }

  ngOnDestroy(): void {
    if (this.socket) this.socket.close();
  }

  private cargarReportesIniciales(): void {
    this.reportesService.obtenerReportes().then((data: any) => {
      this.reportes = data.content.map((r: any) => ({
        id: r.id,
        tipo: r.tipoInfraccion,
        descripcion: r.descripcion,
        latitud: r.latitud,
        longitud: r.longitud,
        fechaIncidente: new Date(r.fechaIncidente),
        horaIncidente: new Date(r.horaIncidente),
        estado: r.estado.toUpperCase(),
        direccion: r.direccion,
      }));

      this.actualizarConteoPorTipo();

      if (this.mapaListo) {
        this.refrescarMapa();
      }
    });
  }

  private agregarReporte(reporte: Reporte): void {
    reporte.fechaIncidente = new Date(reporte.fechaIncidente);
    this.reportes.push(reporte);
    if (this.mapaListo) this.crearMarcador(reporte);
    this.actualizarConteoPorTipo();
  }

  private actualizarReporte(reporteActualizado: Reporte): void {
    const index = this.reportes.findIndex(r => r.id === reporteActualizado.id);
    if (index === -1) return;

    this.reportes[index] = {
      ...this.reportes[index],
      ...reporteActualizado,
      fechaIncidente: new Date(reporteActualizado.fechaIncidente)
    };

    if (this.mapaListo) this.refrescarMapa();
    this.actualizarConteoPorTipo();
  }

  private actualizarConteoPorTipo(): void {
    const conteo: { [key: string]: number } = {};

    this.reportes.forEach(r => {
      const tipoNormalizado = this.normalizarTipo(r.tipo);
      conteo[tipoNormalizado] = (conteo[tipoNormalizado] || 0) + 1;
    });

    this.tiposConteo = Object.entries(conteo).map(([tipo, cantidad]) => ({
      tipo: this.formatTipo(tipo),
      cantidad,
      color: this.getColorPorTipo(tipo),
    }));
  }

  private normalizarTipo(tipo: string): string {
    if (!tipo) return 'OTROS';
    const upper = tipo.toUpperCase();
    if (upper.includes('ESTACIONAMIENT')) return 'ESTACIONAMIENTO_INCORRECTO';
    if (upper.includes('SEMAFOR')) return 'SEMAFORO';
    if (upper.includes('PEATON')) return 'PEATON';
    if (upper.includes('VELOCIDAD')) return 'EXCESO_VELOCIDAD';
    return 'OTROS';
  }

  private formatTipo(tipo: string): string {
    switch (tipo) {
      case 'ESTACIONAMIENTO_INCORRECTO': return 'Estacionamiento Incorrecto';
      case 'SEMAFORO': return 'Semáforo';
      case 'PEATON': return 'Peatón';
      case 'EXCESO_VELOCIDAD': return 'Exceso de Velocidad';
      default: return 'Otros';
    }
  }

  private initMap(): void {
    this.map = L.map('map', { center: [4.5339, -75.6811], zoom: 15 });

    const satelite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    );
    const etiquetas = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    );

    satelite.addTo(this.map);
    etiquetas.addTo(this.map);
    this.markersLayer.addTo(this.map);

    this.mostrarUbicacionActual();
    this.mapaListo = true;
    this.refrescarMapa();
  }

  private mostrarUbicacionActual(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude,
        lng = pos.coords.longitude;
      L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#007bff',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      })
        .addTo(this.map)
        .bindPopup('<b>Tu ubicación</b>');
    });
  }

  private refrescarMapa(): void {
    this.markersLayer.clearLayers();
    this.reportes.forEach((r) => this.crearMarcador(r));
  }

  private crearMarcador(reporte: Reporte): void {
    const tipoNormalizado = this.normalizarTipo(reporte.tipo);

    const marker = L.circleMarker([reporte.latitud, reporte.longitud], {
      radius: 8,
      fillColor: this.getColorPorTipo(tipoNormalizado),
      color: '#fff',
      weight: 2,
      fillOpacity: 1,
    });

    const popupContent = `
      <div style="min-width: 120px;">
        <b>${this.formatTipo(tipoNormalizado)}</b><br>
        <span style="font-size: 11px; color: #666;">
          ${new Date(reporte.fechaIncidente).toLocaleTimeString()}
        </span>
      </div>
    `;

    marker.bindPopup(popupContent);
    marker.on('click', () =>
      this.map.flyTo([reporte.latitud, reporte.longitud], 17, {
        duration: 0.5,
      }),
    );

    marker.addTo(this.markersLayer);
  }

  private getColorPorTipo(tipo: string): string {
    return this.coloresPorTipo[tipo] || this.coloresPorTipo['default'];
  }
}
