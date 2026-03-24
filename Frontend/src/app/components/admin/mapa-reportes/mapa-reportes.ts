import { AfterViewInit, OnInit, OnDestroy, Component, NgZone } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { SidebarAdmin } from '../sidebar-admin/sidebar-admin';
import { ReportesService } from '../../../service/reportes.service';
import { WebsocketService } from '../../../service/websocket';


interface Reporte {
  id: number;
  tipo: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  fechaIncidente: Date ;
  horaIncidente: Date ;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADO';
  agente?: string;
  foto?: string;
  direccion?: string;
}

@Component({
  selector: 'app-mapa-reportes',
  standalone: true,
  templateUrl: './mapa-reportes.html',
  styleUrls: ['./mapa-reportes.css'],
  imports: [RouterModule, CommonModule, SidebarAdmin],
})
export class MapaReportesComponent implements AfterViewInit, OnInit, OnDestroy {
  // --- Propiedades Privadas ---
  private map!: L.Map;
  private markersLayer = L.layerGroup();
  private socket?: WebSocket;
  private mapaListo = false;
 
  private intervaloNuevos?: any;
  private intervaloCambios?: any;
 

  // --- Propiedades Públicas ---
  menuAbierto: boolean = false; // 🔹 Control del Sidebar Responsive
  reportes: Reporte[] = [];
  pendientes = 0;
  enProceso = 0;
  resueltos = 0;
  reporteSeleccionado?: Reporte;
  mostrarDetalle = false;

  constructor(
    private router: Router,
    private zone: NgZone,
    private reportesService: ReportesService,
    private websocketService: WebsocketService,
  ) {}

  private loadSettings() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');

    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
      document.body.style.setProperty('--admin-font-size', savedSize + 'px');
    }
  }

  // --- Ciclo de Vida ---
  ngOnInit(): void {

    // 1️⃣ cargar reportes existentes desde la API

    this.loadSettings();

    this.cargarReportesIniciales();

    // 2️⃣ conectar al websocket
    this.websocketService.connect();

    
  this.websocketService.reportes$.subscribe((reporte) => {
    if (!reporte) return;

     console.log('Reporte en tiempo real:', reporte);

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
    if (this.intervaloNuevos) clearInterval(this.intervaloNuevos);
    if (this.intervaloCambios) clearInterval(this.intervaloCambios);
  }

  // --- Gestión de Datos ---
  private cargarReportesIniciales(): void {
    this.reportesService.obtenerReportes().then((data: any) => {
      console.log('Reportes recibidos:', data);

      this.reportes = data.content.map((r: any) => ({
        id: r.id,
        tipo: r.tipoInfraccion,
        descripcion: r.descripcion,
        latitud: r.latitud,
        longitud: r.longitud,
        fechaIncidente: new Date(r.fechaIncidente),
        horaIncidente: new Date(r.horaIncidente),
        estado: r.estado.toUpperCase(),
      }));

      this.actualizarContadores();

      if (this.mapaListo) {
        this.refrescarMapa();
      }
    });
  }

  private agregarReporte(reporte: Reporte): void {
    reporte.fechaIncidente = new Date(reporte.fechaIncidente);
    this.reportes.push(reporte);
    if (this.mapaListo) this.crearMarcador(reporte);
    this.actualizarContadores();
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
  this.actualizarContadores();
}

  private actualizarContadores(): void {
    this.pendientes = this.reportes.filter(
      (r) => r.estado === 'PENDIENTE',
    ).length;
    this.enProceso = this.reportes.filter(
      (r) => r.estado === 'EN_PROCESO',
    ).length;
    this.resueltos = this.reportes.filter(
      (r) => r.estado === 'FINALIZADO',
    ).length;
  }

  // --- Lógica del Mapa (Leaflet) ---
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
    const marker = L.circleMarker([reporte.latitud, reporte.longitud], {
      radius: 8,
      fillColor: this.getColorEstado(reporte.estado),
      color: '#fff',
      weight: 2,
      fillOpacity: 1,
    });

    const estadoClass = reporte.estado === 'PENDIENTE' ? 'pendiente' : reporte.estado === 'EN_PROCESO' ? 'proceso' : 'resuelto';
    const estadoText = reporte.estado === 'EN_PROCESO' ? 'EN PROCESO' : reporte.estado;
    const fecha = new Date(reporte.fechaIncidente).toLocaleDateString('es-CO');
    const hora = new Date(reporte.fechaIncidente).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    const div = document.createElement('div');
    div.className = 'popup-content';
    div.innerHTML = `
      <div class="popup-header">
        <h3>${reporte.tipo}</h3>
      </div>
      <div class="popup-body">
        <div class="popup-row">
          <span class="popup-label">Fecha</span>
          <span class="popup-value">${fecha}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">Hora</span>
          <span class="popup-value">${hora}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">Estado</span>
          <span class="popup-badge ${estadoClass}">${estadoText}</span>
        </div>
        <button class="popup-btn">Ver detalles</button>
      </div>
    `;

    const btn = div.querySelector('.popup-btn') as HTMLButtonElement;
    btn.onclick = () => this.zone.run(() => this.abrirDetalle(reporte));

    marker.bindPopup(div, {
      closeButton: false,
      className: 'custom-popup'
    });
    marker.on('click', () =>
      this.map.flyTo([reporte.latitud, reporte.longitud], 17, {
        duration: 0.5,
      }),
    );

    marker.addTo(this.markersLayer);
  }

  private getColorEstado(estado: string): string {
    switch (estado) {
      case 'PENDIENTE':
        return '#ffc107';
      case 'EN_PROCESO':
        return '#fd7e14';
      case 'FINALIZADO':
        return '#28a745';
      default:
        return '#6c757d';
    }
  }

  // --- Interacción UI ---
  abrirDetalle(reporte: Reporte): void {
    this.reporteSeleccionado = reporte;
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.reporteSeleccionado = undefined;
  }

  navegarADetalle(id: number): void {
    this.router.navigate(['/admin/reporte', id]);
  }

 
}