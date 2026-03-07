import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService, Usuario } from '../../service/user.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '',
  iconUrl: '',
  shadowUrl: ''
});

@Component({
  selector: 'app-parking',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './parking.html',
  styleUrl: './parking.css',
})
export class Parking implements OnInit, OnDestroy {

  user = { name: '', lastname: '' };

  constructor(private userService: UserService) {}

private baseLayers: L.Layer[] = [];
private currentLayerIndex = 0;

  // Ícono usuario
private userIcon = L.icon({
  iconUrl: 'assets/icons/user-location.svg',
  iconSize: [40, 40],
  iconAnchor: [20, 40]
});

// Ícono parqueadero
private parkingIcon = L.icon({
  iconUrl: 'assets/icons/parking.svg',
  iconSize: [35, 35],
  iconAnchor: [17, 35]
});
  routeInstructions: string[] = [];
  currentYear = new Date().getFullYear();
  sidebarOpen = true;

  map!: L.Map;
  routeControl!: L.Routing.Control;

  userCoords!: L.LatLng;
  userMarker!: L.Marker;

  parkingData: any[] = [];
  selectedParking: any = null;

  isLoading = false;
  searchCompleted = false;
  watchId: number | null = null;

  parkingLayer = L.layerGroup();

  /* ================= INIT ================= */

  ngOnInit(): void {
    this.initMap();
    this.mostrarUbicacion();
    this.userService.getProfile().subscribe({
      next: (user: Usuario) => {
        const parts = user.nombreCompleto.split(' ');
        this.user.name = parts[0];
        this.user.lastname = parts.length > 1 ? parts.slice(1).join(' ') : '';
      },
      error: err => console.error('Error al cargar usuario:', err)
    });
  }

  ngOnDestroy(): void {
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;

    setTimeout(() => {
      this.map.invalidateSize();

      if (this.selectedParking) {
      this.trazarRuta(this.selectedParking);
      }
    }, 400);
  }

  /* ================= MAPA ================= */


  initMap(): void {

    

    const armenia: L.LatLngExpression = [4.535, -75.675];

    const standard = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap contributors' }
    );

    const dark = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '© CartoDB' }
    );

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/' +
      'World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri' }
    );

    const labels = L.tileLayer(
    'https://services.arcgisonline.com/ArcGIS/rest/services/' +
    'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Labels © Esri' }
    );

    const hybrid = L.layerGroup([satellite, labels]);

    this.baseLayers = [standard, dark, hybrid];

    this.map = L.map('map', {
      center: armenia,
      zoom: 13,
      zoomControl: false,
      layers: [this.baseLayers[0]]
    });

    L.control.scale({
      position: 'bottomright',
      metric: true,
      imperial: true
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.control.layers(
      {
        "Mapa estándar": standard,
        "Modo oscuro": dark,
        "Híbrido": hybrid
      },
      {},
      { position: 'bottomleft' }
    ).addTo(this.map);

    this.parkingLayer.addTo(this.map);
  }

  cambiarCapa(): void {

  this.map.removeLayer(this.baseLayers[this.currentLayerIndex]);

  this.currentLayerIndex =
    (this.currentLayerIndex + 1) % this.baseLayers.length;

  this.map.addLayer(this.baseLayers[this.currentLayerIndex]);
}


  async mostrarUbicacion(): Promise<void> {

  const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true
    })
  );

  this.userCoords = L.latLng(pos.coords.latitude, pos.coords.longitude);

  this.map.setView(this.userCoords, 16);

  setTimeout(() => {
    if (this.sidebarOpen) {
      this.map.panBy([180, 10]); // mueve el centro hacia la izquierda
    }
  }, 300);

  if (!this.userMarker) {
    this.userMarker = L.marker(this.userCoords, {
      icon: this.userIcon
    }).addTo(this.map);
  } else {
    this.userMarker.setLatLng(this.userCoords);
  }

  this.iniciarSeguimientoGPS();
}

  /* ================= GEO ================= */

async obtenerUbicacion(): Promise<void> {
  await this.buscarParqueaderos();
}


iniciarSeguimientoGPS(): void {

  if (this.watchId) return;

  this.watchId = navigator.geolocation.watchPosition(pos => {

    this.userCoords = L.latLng(
      pos.coords.latitude,
      pos.coords.longitude
    );

    this.userMarker.setLatLng(this.userCoords);

    if (this.selectedParking && this.routeControl) {
      this.routeControl.setWaypoints([
        this.userCoords,
        L.latLng(this.selectedParking.lat, this.selectedParking.lng)
      ]);
    }

  }, undefined, { enableHighAccuracy: true });
}

  /* ================= BUSCAR PARQUEADEROS ================= */
  private cargandoParqueaderos = false;

async buscarParqueaderos(): Promise<void> {

  if (!this.userCoords) {
    console.warn('Ubicación aún no disponible');
    return;
  }

  if (this.cargandoParqueaderos) return;
  this.cargandoParqueaderos = true;

  this.isLoading = true;
  this.searchCompleted = false;

  try {

    this.parkingLayer.clearLayers();

    const query = `
      [out:json][timeout:25];
      node(around:30000,${this.userCoords.lat},${this.userCoords.lng}) [amenity=parking];
      out center;
    `;

    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    );

    if (!res.ok) {
      throw new Error('Error consultando Overpass API');
    }

    const data = await res.json();

    this.parkingData = data.elements
      .filter((n: any) => n.lat || n.center)
      .map((n: any) => {

        const lat = n.lat ?? n.center?.lat;
        const lon = n.lon ?? n.center?.lon;

        const latLng = L.latLng(lat, lon);

        const distanceMeters =
          this.map.distance(this.userCoords, latLng) ?? 0;

        const distanceKm = distanceMeters / 1000;
        const estimatedMinutes = (distanceKm / 40) * 60;

        return {
          lat,
          lng: lon,
          name: n.tags?.name || 'Parqueadero',
          address: `${n.tags?.['addr:street'] || ''} ${n.tags?.['addr:housenumber'] || ''}`.trim() || 'Dirección no disponible',
          distanceKm: distanceKm.toFixed(2),
          durationMin: Math.ceil(estimatedMinutes),
          coordinates: `${lat.toFixed(5)}, ${lon.toFixed(5)}`
        };
      });

    this.parkingData.sort(
      (a, b) => Number(a.distanceKm) - Number(b.distanceKm)
    );

    this.renderMarkers();

    if (this.parkingData.length > 0) {
      this.trazarRuta(this.parkingData[0]);
    }

    this.searchCompleted = true;

  } catch (error) {
    console.error('Error buscando parqueaderos:', error);
  } finally {
    this.isLoading = false;
    this.cargandoParqueaderos = false;
  }
}
  renderMarkers(): void {

    this.parkingData.forEach(p => {

      const marker = L.marker([p.lat, p.lng], {
        icon: this.parkingIcon
      });

      marker.on('click', () => this.trazarRuta(p));
      marker.addTo(this.parkingLayer);
    });
  }

  /* ================= RUTA ================= */
private simulationInterval: any;

trazarRuta(parking: any): void {

  this.selectedParking = parking;

  const waypoints = [
    this.userCoords,
    L.latLng(parking.lat, parking.lng)
  ];

  // Si no existe el control, lo creamos
  if (this.routeControl) {
    this.map.removeControl(this.routeControl);
    this.routeControl = undefined as any;
  }

  this.map.eachLayer((layer) => {
    if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
      this.map.removeLayer(layer);
    }
  });

    this.routeControl = L.Routing.control({
      waypoints,
      addWaypoints: false,
      routeWhileDragging: false,
      show: false,
      lineOptions: {
        styles: [{ color: '#2563eb', weight: 6 }]
      },
      router: L.Routing.osrmv1({
        profile: 'car',
        language: 'es'
      })
    }).addTo(this.map);

    this.routeControl.on('routesfound', (e: any) => {

       const route = e.routes[0];

      this.hablarIndicaciones(e.routes[0]);

      this.simularRecorrido(route.coordinates);

      this.routeInstructions =
        route.instructions?.map((i: any) => i.text) || [];
  
      const bounds = L.latLngBounds([
        this.userCoords,
        L.latLng(this.selectedParking.lat, this.selectedParking.lng)
      ]);
      this.map.fitBounds(bounds, {
      paddingTopLeft: this.sidebarOpen ? [380, 120] : [120, 120],
      paddingBottomRight: [120, 120],
      maxZoom: 16
    });

    setTimeout(() => {
      this.map.setZoom(this.map.getZoom() - 0.5);
    }, 200);
    });
}

    private hablarIndicaciones(route: any): void {

  if (!('speechSynthesis' in window)) return;

  const instrucciones = route.instructions;

  instrucciones.forEach((inst: any, i: number) => {

    setTimeout(() => {

      const mensaje = new SpeechSynthesisUtterance(inst.text);
      mensaje.lang = 'es-ES';
      speechSynthesis.speak(mensaje);

    }, i * 4000); // cada 4 segundos

  });
}

    private simularRecorrido(coordinates: L.LatLng[]): void {

  let index = 0;

  const interval = setInterval(() => {

    if (index >= coordinates.length) {
      clearInterval(interval);
      return;
    }

    const punto = coordinates[index];

    this.userMarker.setLatLng(punto);

    this.map.setView(punto, 17);

    index++;

  }, 500); // velocidad simulada (500ms por punto)
    }
  }