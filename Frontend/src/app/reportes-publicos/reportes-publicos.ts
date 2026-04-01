import { AfterViewInit, OnInit, OnDestroy, Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { ReportesService } from '../service/reportes.service';
import { WebsocketService } from '../service/websocket';
import { Nav } from '../shared/nav/nav';


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
  imports: [CommonModule, Nav],
})
export class ReportesPublicos implements AfterViewInit, OnInit, OnDestroy {
  private map!: L.Map;
  private markersLayer = L.layerGroup();
  private socket?: WebSocket;
  private mapaListo = false;

  reportes: Reporte[] = [];

  tiposConteo: { tipo: string; cantidad: number; color: string }[] = [
    { tipo: 'Accidente de Tránsito', cantidad: 0, color: '#e74c3c' },
    { tipo: 'Vehículo Mal Estacionado', cantidad: 0, color: '#f1c40f' },
    { tipo: 'Semáforo Dañado', cantidad: 0, color: '#27ae60' },
    { tipo: 'Conducción Peligrosa', cantidad: 0, color: '#e67e22' },
    { tipo: 'Otros', cantidad: 0, color: '#95a5a6' },
  ];

  private coloresPorTipo: { [key: string]: string } = {
    'ACCIDENTE': '#e74c3c',
    'ACCIDENTE_DE_TRÁNSITO': '#e74c3c',
    'ACCIDENTE_DE_TRANSITO': '#e74c3c',
    'VEHICULO_MAL_ESTACIONADO': '#f1c40f',
    'VEHÍCULO_MAL_ESTACIONADO': '#f1c40f',
    'MAL_ESTACIONAMIENTO': '#f1c40f',
    'SEMAFORO': '#27ae60',
    'SEMÁFORO': '#27ae60',
    'SEMAFORO_DAÑADO': '#27ae60',
    'CONDUCCION_PELIGROSA': '#e67e22',
    'CONDUCCIÓN_PELIGROSA': '#e67e22',
    'EXCESO_VELOCIDAD': '#e67e22',
    'EXCESO_DE_VELOCIDAD': '#e67e22',
    'PEATON': '#e67e22',
    'PEATONES': '#e67e22',
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

    this.tiposConteo.forEach(item => {
      const tipoKey = this.getTipoKey(item.tipo);
      item.cantidad = conteo[tipoKey] || 0;
    });
  }

  private getTipoKey(nombreTipo: string): string {
    switch (nombreTipo) {
      case 'Accidente de Tránsito': return 'ACCIDENTE';
      case 'Vehículo Mal Estacionado': return 'MAL_ESTACIONAMIENTO';
      case 'Semáforo Dañado': return 'SEMAFORO_DAÑADO';
      case 'Conducción Peligrosa': return 'CONDUCCION_PELIGROSA';
      case 'Otros': return 'OTROS';
      default: return 'OTROS';
    }
  }

  private normalizarTipo(tipo: string): string {
    if (!tipo) return 'OTROS';
    const upper = tipo.toUpperCase();
    if (upper.includes('ACCIDENT')) return 'ACCIDENTE';
    if (upper.includes('VEHICULO') || upper.includes('ESTACIONADO') || upper.includes('ESTACIONAMIENT')) return 'MAL_ESTACIONAMIENTO';
    if (upper.includes('SEMAFOR')) return 'SEMAFORO_DAÑADO';
    if (upper.includes('VELOCIDAD') || upper.includes('CONDUCCION') || upper.includes('PEATON')) return 'CONDUCCION_PELIGROSA';
    return 'OTROS';
  }

  private formatTipo(tipo: string): string {
    switch (tipo) {
      case 'ACCIDENTE': return 'Accidente de Tránsito';
      case 'MAL_ESTACIONAMIENTO': return 'Vehículo Mal Estacionado';
      case 'SEMAFORO_DAÑADO': return 'Semáforo Dañado';
      case 'CONDUCCION_PELIGROSA': return 'Conducción Peligrosa';
      case 'SEMAFORO': return 'Semáforo Dañado';
      case 'PEATON': return 'Conducción Peligrosa';
      case 'EXCESO_VELOCIDAD': return 'Conducción Peligrosa';
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
