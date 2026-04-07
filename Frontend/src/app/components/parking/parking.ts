import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService, Usuario } from '../../service/user.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  imports: [RouterModule, CommonModule, FormsModule],
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
  errorMessage = '';
  locationAccuracy = 0;
  showAccuracyWarning = false;
  searchAddress = '';
  isLocating = false;

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

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

    this.locationAccuracy = pos.coords.accuracy;
    this.showAccuracyWarning = this.locationAccuracy > 100;

   

    this.userCoords = L.latLng(pos.coords.latitude, pos.coords.longitude);

    this.map.setView(this.userCoords, 16);

    setTimeout(() => {
      if (this.sidebarOpen) {
        this.map.panBy([180, 10]);
      }
    }, 300);

    if (!this.userMarker) {
      this.userMarker = L.marker(this.userCoords, {
        icon: this.userIcon,
        draggable: true
      }).addTo(this.map);

      this.userMarker.on('dragend', (e: any) => {
        const newCoords = e.target.getLatLng();
        this.userCoords = L.latLng(newCoords.lat, newCoords.lng);
        
        
        if (this.selectedParking && this.routeControl) {
          this.routeControl.setWaypoints([
            this.userCoords,
            L.latLng(this.selectedParking.lat, this.selectedParking.lng)
          ]);
        }
      });
    } else {
      this.userMarker.setLatLng(this.userCoords);
    }

    this.iniciarSeguimientoGPS();
  } catch (error: any) {
    console.error('Error al obtener ubicación:', error);
    if (error.code === 1) {
      this.errorMessage = 'Permiso de ubicación denegado. Por favor habilita la ubicación en tu navegador.';
    } else if (error.code === 2) {
      this.errorMessage = 'Ubicación no disponible. Verifica tu conexión GPS.';
    } else if (error.code === 3) {
      this.errorMessage = 'Tiempo de espera de ubicación agotado. Intenta de nuevo.';
    } else {
      this.errorMessage = 'No se pudo obtener tu ubicación.';
    }
  }
}

  /* ================= GEO ================= */

async obtenerUbicacion(): Promise<void> {
  await this.buscarParqueaderos();
}


  iniciarSeguimientoGPS(): void {

  if (this.watchId) return;

  const watchOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000
  };

  this.watchId = navigator.geolocation.watchPosition(pos => {
    const newAccuracy = pos.coords.accuracy;
    
    if (newAccuracy > 100 && !this.showAccuracyWarning) {
      this.showAccuracyWarning = true;
      this.locationAccuracy = newAccuracy;
    }

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
  }, (error) => {
    console.error('Error en seguimiento GPS:', error.message);
  }, watchOptions);
}

  /* ================= BUSCAR POR DIRECCIÓN ================= */

  async buscarPorDireccion(): Promise<void> {
    if (!this.searchAddress.trim()) {
      this.errorMessage = 'Ingresa una dirección para buscar';
      return;
    }

    this.isLocating = true;
    this.errorMessage = '';

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchAddress)}&limit=1`
      );

      if (!response.ok) {
        throw new Error('Error al buscar dirección');
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        this.errorMessage = 'No se encontró la dirección. Intenta con otra.';
        this.isLocating = false;
        return;
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      this.userCoords = L.latLng(lat, lon);
      this.map.setView(this.userCoords, 16);

      if (this.userMarker) {
        this.userMarker.setLatLng(this.userCoords);
      } else {
        this.userMarker = L.marker(this.userCoords, {
          icon: this.userIcon,
          draggable: true
        }).addTo(this.map);

        this.userMarker.on('dragend', (e: any) => {
          const newCoords = e.target.getLatLng();
          this.userCoords = L.latLng(newCoords.lat, newCoords.lng);
          console.log('Ubicación manual - Lat:', newCoords.lat, 'Lng:', newCoords.lng);
          
          if (this.selectedParking && this.routeControl) {
            this.routeControl.setWaypoints([
              this.userCoords,
              L.latLng(this.selectedParking.lat, this.selectedParking.lng)
            ]);
          }
        });
      }

      this.showAccuracyWarning = false;
      console.log(`Dirección encontrada: ${result.display_name}`);

    } catch (error: any) {
      this.errorMessage = 'Error al buscar dirección. Intenta más tarde.';
      console.error('Error buscando dirección:', error);
    } finally {
      this.isLocating = false;
    }
  }

  /* ================= REINTENTAR GPS ================= */

  async reintentarUbicacion(): Promise<void> {
    this.isLocating = true;
    this.errorMessage = '';
    this.showAccuracyWarning = false;

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

      this.locationAccuracy = pos.coords.accuracy;
      this.showAccuracyWarning = this.locationAccuracy > 100;

      console.log(`Ubicación obtenida - Lat: ${pos.coords.latitude}, Lng: ${pos.coords.longitude}, Precisión: ${this.locationAccuracy}m`);

      this.userCoords = L.latLng(pos.coords.latitude, pos.coords.longitude);

      this.map.setView(this.userCoords, 16);

      if (this.userMarker) {
        this.userMarker.setLatLng(this.userCoords);
      }

      if (this.selectedParking && this.routeControl) {
        this.routeControl.setWaypoints([
          this.userCoords,
          L.latLng(this.selectedParking.lat, this.selectedParking.lng)
        ]);
      }

    } catch (error: any) {
      console.error('Error al reintentar ubicación:', error);
      if (error.code === 1) {
        this.errorMessage = 'Permiso de ubicación denegado.';
      } else if (error.code === 2) {
        this.errorMessage = 'Ubicación no disponible.';
      } else if (error.code === 3) {
        this.errorMessage = 'Tiempo agotado. Intenta de nuevo.';
      } else {
        this.errorMessage = 'No se pudo obtener ubicación.';
      }
    } finally {
      this.isLocating = false;
    }
  }

  /* ================= BUSCAR PARQUEADEROS ================= */
  private cargandoParqueaderos = false;

  private readonly overpassApi = 'https://overpass-api.de/api/interpreter';

  private async fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) return res;
        
        if (res.status === 504 || res.status === 503 || res.status >= 500) {
          lastError = new Error(`Servidor ocupado: ${res.status}`);
          console.log(`Intento ${attempt + 1} fallado, reintentando...`);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err: any) {
        lastError = err;
        console.log(`Intento ${attempt + 1} error: ${err.message}`);
      }
      
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
    
    throw lastError || new Error('Todos los intentos fallaron');
  }

async buscarParqueaderos(): Promise<void> {

  if (!this.userCoords) {
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
      node(around:8000,${this.userCoords.lat},${this.userCoords.lng}) [amenity=parking];
      out center;
    `;

    const encodedQuery = encodeURIComponent(query);

    

    let data: any = null;
    
    try {
      const res = await this.fetchWithRetry(`${this.overpassApi}?data=${encodedQuery}`);
      data = await res.json();
    } catch (err: any) {
      throw new Error('Overpass API ocupada. Intenta más tarde.');
    }

    if (!data || !data.elements) {
      throw new Error('No se recibió respuesta de Overpass API');
    }

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
    } else {
      this.errorMessage = 'No se encontraron parqueaderos en esta zona';
    }

    this.searchCompleted = true;

  } catch (error: any) {
    console.error('Error buscando parqueaderos:', error);
    this.errorMessage = error.message || 'Error al buscar parqueaderos';
    this.searchCompleted = true;
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