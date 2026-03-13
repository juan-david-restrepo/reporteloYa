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
  fechaIncidente: Date | string;
  horaIncidente: Date | string;
  estado: 'pendiente' | 'en_proceso' | 'resuelto';
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
  private modoDemo = false;
  private intervaloNuevos?: any;
  private intervaloCambios?: any;
  private agentesDemo = [
    'Unidad Móvil 12',
    'Patrulla Vial 7',
    'Agente Ramírez',
    'Agente Torres',
    'Grúa Municipal',
    'Motorizado 3',
  ];

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

    const isColorBlind = localStorage.getItem('colorBlind') === 'true';
    if (isColorBlind) document.body.classList.add('color-blind');

    const savedSize = localStorage.getItem('fontSize') || 'normal';
    document.body.classList.add(`font-${savedSize}`);
  }

  // --- Ciclo de Vida ---
  ngOnInit(): void {

    // 1️⃣ cargar reportes existentes desde la API

    this.loadSettings();

    this.cargarReportesIniciales();

    // 2️⃣ conectar al websocket
    this.websocketService.connect();

    // 3️⃣ suscribirse a reportes en tiempo real
    this.websocketService.subscribeToReports();

    this.websocketService.reportes$.subscribe((reporte) => {
      if (!reporte) return;

      console.log('Reporte en tiempo real:', reporte);

      this.agregarReporte(reporte);
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
        estado: r.estado.toLowerCase(),
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
    const index = this.reportes.findIndex(
      (r) => r.id === reporteActualizado.id,
    );
    if (index === -1) return;
    reporteActualizado.fechaIncidente = new Date(reporteActualizado.fechaIncidente);
    this.reportes[index] = reporteActualizado;
    if (this.mapaListo) this.refrescarMapa();
    this.actualizarContadores();
  }

  private actualizarContadores(): void {
    this.pendientes = this.reportes.filter(
      (r) => r.estado === 'pendiente',
    ).length;
    this.enProceso = this.reportes.filter(
      (r) => r.estado === 'en_proceso',
    ).length;
    this.resueltos = this.reportes.filter(
      (r) => r.estado === 'resuelto',
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

    const div = document.createElement('div');
    div.innerHTML = `<b>${reporte.tipo}</b><br>${new Date(reporte.fechaIncidente).toLocaleTimeString()}<br><button class='detalle-btn'>Ver detalles</button>`;

    const btn = div.querySelector('.detalle-btn') as HTMLButtonElement;
    btn.onclick = () => this.zone.run(() => this.abrirDetalle(reporte));

    marker.bindPopup(div);
    marker.on('click', () =>
      this.map.flyTo([reporte.latitud, reporte.longitud], 17, {
        duration: 0.5,
      }),
    );

    marker.addTo(this.markersLayer);
  }

  private getColorEstado(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return '#ffc107';
      case 'en_proceso':
        return '#fd7e14';
      case 'resuelto':
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

  // --- Simulador Demo ---
  private activarSimulador(): void {
    if (this.modoDemo) return;
    this.modoDemo = true;
  }
}