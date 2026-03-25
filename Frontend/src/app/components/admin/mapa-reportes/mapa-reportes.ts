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
  horaIncidente?: Date | null;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADO';
  agente?: string;
  placaAcompanante?: string;
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
  finalizados = 0;
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
      if (data.content && data.content.length > 0) {
        console.log('Primer reporte (debug):', JSON.stringify(data.content[0], null, 2));
      }
      console.log('Reportes recibidos:', JSON.stringify(data.content, null, 2));

      this.reportes = data.content.map((r: any) => {
        const estado = r.estado.toUpperCase();
        const esAtendido = estado === 'EN_PROCESO' || estado === 'FINALIZADO';
        
        let agente = '';
        let placaAcompanante = '';
        
        if (esAtendido) {
          if (r.agente?.placa) {
            agente = r.agente.placa;
          } else if (r.placaAgente) {
            agente = r.placaAgente;
          }
          
          if (r.agenteCompanero?.placa) {
            placaAcompanante = r.agenteCompanero.placa;
          } else if (r.placaCompanero) {
            placaAcompanante = r.placaCompanero;
          } else if (r.nombreCompanero) {
            placaAcompanante = r.nombreCompanero;
          } else if (r.acompanado && !placaAcompanante) {
            placaAcompanante = 'Con acompañante';
          }
        }
        
        return {
          id: r.id,
          tipo: r.tipoInfraccion,
          descripcion: r.descripcion,
          latitud: r.latitud,
          longitud: r.longitud,
          fechaIncidente: new Date(r.fechaIncidente),
          horaIncidente: r.horaIncidente || null,
          direccion: r.direccion || '',
          agente: agente,
          placaAcompanante: placaAcompanante,
          estado: estado,
        };
      });

      this.actualizarContadores();

      if (this.mapaListo) {
        this.refrescarMapa();
      }
    });
  }

  private agregarReporte(reporte: any): void {
    reporte.fechaIncidente = new Date(reporte.fechaIncidente);
    
    const estado = reporte.estado?.toUpperCase();
    const esAtendido = estado === 'EN_PROCESO' || estado === 'FINALIZADO';
    
    if (esAtendido) {
      if (reporte.agente?.placa) {
        reporte.agente = reporte.agente.placa;
      } else if (reporte.placaAgente) {
        reporte.agente = reporte.placaAgente;
      }
      
      if (reporte.agenteCompanero?.placa) {
        reporte.placaAcompanante = reporte.agenteCompanero.placa;
      } else if (reporte.placaCompanero) {
        reporte.placaAcompanante = reporte.placaCompanero;
      } else if (reporte.nombreCompanero) {
        reporte.placaAcompanante = reporte.nombreCompanero;
      } else if (reporte.acompanado && !reporte.placaAcompanante) {
        reporte.placaAcompanante = 'Con acompañante';
      }
    }
    
    this.reportes.push(reporte as Reporte);
    if (this.mapaListo) this.crearMarcador(reporte as Reporte);
    this.actualizarContadores();
  }

private actualizarReporte(reporteActualizado: any): void {
  const index = this.reportes.findIndex(r => r.id === reporteActualizado.id);
  if (index === -1) return;

  const estado = reporteActualizado.estado?.toUpperCase();
  const esAtendido = estado === 'EN_PROCESO' || estado === 'FINALIZADO';
  
  if (esAtendido) {
    if (reporteActualizado.agente?.placa) {
      reporteActualizado.agente = reporteActualizado.agente.placa;
    } else if (reporteActualizado.placaAgente) {
      reporteActualizado.agente = reporteActualizado.placaAgente;
    }
    
    if (reporteActualizado.agenteCompanero?.placa) {
      reporteActualizado.placaAcompanante = reporteActualizado.agenteCompanero.placa;
    } else if (reporteActualizado.placaCompanero) {
      reporteActualizado.placaAcompanante = reporteActualizado.placaCompanero;
    } else if (reporteActualizado.nombreCompanero) {
      reporteActualizado.placaAcompanante = reporteActualizado.nombreCompanero;
    } else if (reporteActualizado.acompanado && !reporteActualizado.placaAcompanante) {
      reporteActualizado.placaAcompanante = 'Con acompañante';
    }
  }

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
    this.finalizados = this.reportes.filter(
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

    const estadoClass = reporte.estado === 'PENDIENTE' ? 'pendiente' : reporte.estado === 'EN_PROCESO' ? 'proceso' : 'finalizado';
    const estadoText = reporte.estado === 'EN_PROCESO' ? 'EN PROCESO' : reporte.estado;
    
    const fechaObj = new Date(reporte.fechaIncidente);
    let hora = '--:--';
    
    if (reporte.horaIncidente) {
      const horaStr = String(reporte.horaIncidente);
      if (horaStr && horaStr.includes(':')) {
        const [h, m] = horaStr.split(':');
        const horaDate = new Date();
        horaDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        hora = horaDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      } else if (!isNaN(fechaObj.getTime())) {
        hora = fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      }
    } else if (fechaObj && !isNaN(fechaObj.getTime())) {
      hora = fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }
    
    const fecha = fechaObj.toLocaleDateString('es-CO');

    const div = document.createElement('div');
    div.className = 'popup-content';
    div.innerHTML = `
      <div class="popup-header">
        <h3>${reporte.tipo}</h3>
        <button class="popup-close" onclick="document.querySelector('.leaflet-popup-close-button')?.click()">✕</button>
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

    const closeBtn = div.querySelector('.popup-close') as HTMLButtonElement;
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.map.closePopup();
    };

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
        return '#f59e0b';
      case 'EN_PROCESO':
        return '#3b82f6';
      case 'FINALIZADO':
        return '#22c55e';
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

  getClaseEstado(estado: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'estado-pendiente';
      case 'EN_PROCESO': return 'estado-proceso';
      case 'FINALIZADO': return 'estado-finalizado';
      default: return '';
    }
  }

  getHoraFormateada(reporte: Reporte): string {
    if (reporte.horaIncidente) {
      const horaStr = String(reporte.horaIncidente);
      if (horaStr && horaStr.includes(':')) {
        const [h, m] = horaStr.split(':');
        const horaDate = new Date();
        horaDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        return horaDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      }
    }
    if (reporte.fechaIncidente) {
      const fechaObj = new Date(reporte.fechaIncidente);
      if (!isNaN(fechaObj.getTime())) {
        return fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      }
    }
    return '--:--';
  }

  
}