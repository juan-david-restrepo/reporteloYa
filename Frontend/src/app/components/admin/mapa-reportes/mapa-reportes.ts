/*=================================================================
  COMPONENTE: MAPA DE REPORTES
  Función: Muestra un mapa interactivo con todos los reportes de 
  incidentes viales en tiempo real. Permite monitorear el estado
  de los reportes (pendientes, en proceso, finalizados).
=================================================================*/

/*------------------ IMPORTACIONES ------------------
  Angular Core: Manejo del componente, ciclo de vida
  Router: Navegación entre páginas
  CommonModule: Directivas comunes de Angular (ngIf, ngFor, etc.)
  Leaflet: Biblioteca para mapas interactivos
*/
import { AfterViewInit, OnInit, OnDestroy, Component, NgZone } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

/*------------------ COMPONENTES Y SERVICIOS ------------------
  - SidebarAdmin: Menú lateral del panel de admin
  - ReportesService: Obtiene reportes del servidor
  - WebsocketService: Recibe actualizaciones en tiempo real
*/
import { SidebarAdmin } from '../sidebar-admin/sidebar-admin';
import { ReportesService } from '../../../service/reportes.service';
import { WebsocketService } from '../../../service/websocket';


/*------------------ INTERFAZ REPORTE ------------------
  Define la estructura de datos de un reporte en el frontend
*/
interface Reporte {
  id: number;                    // ID único del reporte
  tipo: string;                 // Tipo de infracción/incidente
  descripcion: string;          // Descripción del incidente
  latitud: number;              // Coordenada X (latitud)
  longitud: number;             // Coordenada Y (longitud)
  fechaIncidente: Date;         // Fecha del incidente
  horaIncidente?: Date | null;  // Hora del incidente
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADO';  // Estado del reporte
  agente?: string;              // Placa del agente que atiende
  placaAcompanante?: string;    // Placa del agente compañero
  foto?: string;                // URL de foto (opcional)
  direccion?: string;          // Dirección textual del incidente
}


/*========================================================
  DECORADOR @COMPONENT
  Configuración base del componente
=========================================================*/
@Component({
  selector: 'app-mapa-reportes',     // Etiqueta HTML para usar este componente
  standalone: true,                   // Componente independiente
  templateUrl: './mapa-reportes.html', // Plantilla HTML
  styleUrls: ['./mapa-reportes.css'],  // Estilos CSS
  imports: [RouterModule, CommonModule, SidebarAdmin],  // Módulos necesarios
})

/*========================================================
  CLASE PRINCIPAL
  Implementa ciclo de vida: AfterViewInit, OnInit, OnDestroy
=========================================================*/
export class MapaReportesComponent implements AfterViewInit, OnInit, OnDestroy {

  /*------------------ 1. PROPIEDADES PRIVADAS ------------------
    Encapsulan la lógica interna del componente
  */
  
  private map!: L.Map;                // Instancia del mapa Leaflet
  private markersLayer = L.layerGroup(); // Capa que contiene todos los marcadores
  private socket?: WebSocket;          // Conexión WebSocket (actualmente sin uso)
  private mapaListo = false;           // Bandera: ¿El mapa está inicializado?
 
  private intervaloNuevos?: any;       // Intervalo para nuevos reportes (sin usar)
  private intervaloCambios?: any;      // Intervalo para cambios (sin usar)
 

  /*------------------ 2. PROPIEDADES PÚBLICAS ------------------
    Variables accesibles desde la plantilla HTML
  */
  
  menuAbierto: boolean = false;       // Control del menú lateral en móvil
  reportes: Reporte[] = [];           // Lista de todos los reportes
  pendientes = 0;                       // Contador de reportes pendientes
  enProceso = 0;                       // Contador de reportes en proceso
  finalizados = 0;                     // Contador de reportes finalizados
  reporteSeleccionado?: Reporte;       // Reporte seleccionado para ver detalles
  mostrarDetalle = false;             // Controla la visibilidad del panel de detalles


  /*------------------ 3. CONSTRUCTOR ------------------
    Inicializa los servicios necesarios
  */
  constructor(
    private router: Router,              // Para navegar a otras páginas
    private zone: NgZone,               // Para ejecutar código fuera de Angular
    private reportesService: ReportesService,  // Para obtener reportes
    private websocketService: WebsocketService, // Para tiempo real
  ) {}


  /*------------------ 4. CONFIGURACIÓN INICIAL ------------------
    Carga la configuración guardada del usuario
  */
  private loadSettings() {
    // Carga modo oscuro
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');

    // Carga tamaño de fuente
    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
      document.body.style.setProperty('--admin-font-size', savedSize + 'px');
    }
  }


  /*------------------ 5. ngOnInit - INICIALIZACIÓN ------------------
    Se ejecuta al iniciar el componente
    Carga datos iniciales y configura WebSocket
  */
  ngOnInit(): void {

    // Carga configuraciones guardadas
    this.loadSettings();

    // Carga los reportes existentes desde el servidor
    this.cargarReportesIniciales();

    // Conecta al servicio WebSocket para tiempo real
    this.websocketService.connect();

    /*----- SUSCRIPCIÓN A REPORTES EN TIEMPO REAL -----
      Escucha cuando llega un nuevo reporte o se actualiza uno existente
    */
    this.websocketService.reportes$.subscribe((reporte) => {
      if (!reporte) return;

      // Busca si el reporte ya existe en la lista
      const existe = this.reportes.find((r) => r.id === reporte.id);

      // Si existe, lo actualiza; si no, lo agrega nuevo
      if (existe) {
        this.actualizarReporte(reporte);
      } else {
        this.agregarReporte(reporte);
      }
    });
  }


  /*------------------ 6. ngAfterViewInit - DESPUÉS DE RENDERIZAR VISTA ------------------
    Se ejecuta después de que la vista HTML está lista
    Aquí se inicializa el mapa (requiere que el DOM esté listo)
  */
  ngAfterViewInit(): void {
    // setTimeout asegura que el DOM del mapa ya existe
    setTimeout(() => {
      this.initMap();
      // invalidateSize corrige problemas de tamaño en mapas dentro de contenedores
      setTimeout(() => this.map.invalidateSize(), 300);
    });
  }


  /*------------------ 7. ngOnDestroy - LIMPIEZA AL DESTRUIR ------------------
    Se ejecuta al salir del componente
    IMPORTANTE: Cerrar conexiones y limpiar intervalos
  */
  ngOnDestroy(): void {
    if (this.socket) this.socket.close();
    if (this.intervaloNuevos) clearInterval(this.intervaloNuevos);
    if (this.intervaloCambios) clearInterval(this.intervaloCambios);
  }


  /*------------------ 8. CARGA DE DATOS ------------------
    Métodos para obtener y procesar reportes del servidor
  */

  // Carga los reportes iniciales al abrir el componente
  private cargarReportesIniciales(): void {
    this.reportesService.obtenerReportes().then((data: any) => {
      // Transforma los datos del servidor al formato de la interfaz Reporte
      this.reportes = data.content.map((r: any) => {
        const estado = r.estado.toUpperCase();
        const esAtendido = estado === 'EN_PROCESO' || estado === 'FINALIZADO';
        
        let agente = '';
        let placaAcompanante = '';
        
        // Extrae la placa del agente que atiende (maneja diferentes formatos)
        if (esAtendido) {
          if (r.agente?.placa) {
            agente = r.agente.placa;
          } else if (r.placaAgente) {
            agente = r.placaAgente;
          }
          
          // Extrae la placa del agente compañero
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
        
        // Retorna el objeto transformado
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

      // Actualiza los contadores de estado
      this.actualizarContadores();

      // Si el mapa ya está listo, muestra los marcadores
      if (this.mapaListo) {
        this.refrescarMapa();
      }
    });
  }

  // Agrega un nuevo reporte a la lista (recibido por WebSocket)
  private agregarReporte(reporte: any): void {
    // Convierte la fecha a objeto Date
    reporte.fechaIncidente = new Date(reporte.fechaIncidente);
    
    const estado = reporte.estado?.toUpperCase();
    const esAtendido = estado === 'EN_PROCESO' || estado === 'FINALIZADO';
    
    // Extrae información del agente que atiende
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
    
    // Agrega a la lista y actualiza el mapa si está listo
    this.reportes.push(reporte as Reporte);
    if (this.mapaListo) this.crearMarcador(reporte as Reporte);
    this.actualizarContadores();
  }

  // Actualiza un reporte existente (cuando cambia su estado)
  private actualizarReporte(reporteActualizado: any): void {
    // Busca el índice del reporte en el array
    const index = this.reportes.findIndex(r => r.id === reporteActualizado.id);
    if (index === -1) return;

    const estado = reporteActualizado.estado?.toUpperCase();
    const esAtendido = estado === 'EN_PROCESO' || estado === 'FINALIZADO';
    
    // Actualiza la información del agente si está atendido
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

    // Combina los datos anteriores con los nuevos
    this.reportes[index] = {
      ...this.reportes[index],
      ...reporteActualizado,
      fechaIncidente: new Date(reporteActualizado.fechaIncidente)
    };

    // Refresca el mapa y actualiza contadores
    if (this.mapaListo) this.refrescarMapa();
    this.actualizarContadores();
  }

  // Actualiza los contadores de reportes por estado
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


  /*------------------ 9. LÓGICA DEL MAPA (LEAFLET) ------------------
    Métodos para inicializar y manipular el mapa interactivo
  */

  // Inicializa el mapa con la configuración base
  private initMap(): void {
    // Crea el mapa centrado en una ubicación específica (coordenadas de ejemplo)
    this.map = L.map('map', { center: [4.5339, -75.6811], zoom: 15 });

    // Define la capa de satélite (imágenes satelitales de ArcGIS)
    const satelite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    );
    
    // Define la capa de etiquetas (nombres de calles, lugares)
    const etiquetas = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    );

    // Agrega las capas al mapa
    satelite.addTo(this.map);
    etiquetas.addTo(this.map);
    this.markersLayer.addTo(this.map);

    // Muestra la ubicación actual del usuario
    this.mostrarUbicacionActual();
    
    this.mapaListo = true;
    this.refrescarMapa();
  }

  // Muestra la ubicación actual del navegador del usuario
  private mostrarUbicacionActual(): void {
    // Verifica si el navegador soporta geolocalización
    if (!navigator.geolocation) return;
    
    // Obtiene la posición actual
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude,
        lng = pos.coords.longitude;
      
      // Crea un marcador circular azul para la posición actual
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

  // Limpia y redibuja todos los marcadores en el mapa
  private refrescarMapa(): void {
    this.markersLayer.clearLayers();  // Elimina todos los marcadores existentes
    this.reportes.forEach((r) => this.crearMarcador(r));  // Crea marcadores para cada reporte
  }

  // Crea un marcador en el mapa para un reporte específico
  private crearMarcador(reporte: Reporte): void {
    // Crea un marcador circular con color según el estado
    const marker = L.circleMarker([reporte.latitud, reporte.longitud], {
      radius: 8,
      fillColor: this.getColorEstado(reporte.estado),  // Color según estado
      color: '#fff',
      weight: 2,
      fillOpacity: 1,
    });

    // Prepara las clases y texto para el popup
    const estadoClass = reporte.estado === 'PENDIENTE' ? 'pendiente' : reporte.estado === 'EN_PROCESO' ? 'proceso' : 'finalizado';
    const estadoText = reporte.estado === 'EN_PROCESO' ? 'EN PROCESO' : reporte.estado;
    
    // Formatea la fecha y hora
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

    // Crea el contenido HTML del popup (ventana que aparece al hacer click)
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

    // Asocia el botón "Ver detalles" con la función abrirDetalle
    const btn = div.querySelector('.popup-btn') as HTMLButtonElement;
    btn.onclick = () => this.zone.run(() => this.abrirDetalle(reporte));

    // Asocia el botón de cerrar
    const closeBtn = div.querySelector('.popup-close') as HTMLButtonElement;
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.map.closePopup();
    };

    // Vincula el popup al marcador
    marker.bindPopup(div, {
      closeButton: false,
      className: 'custom-popup'
    });
    
    // Al hacer click, el mapa vuela hacia la ubicación del marcador
    marker.on('click', () =>
      this.map.flyTo([reporte.latitud, reporte.longitud], 17, {
        duration: 0.5,
      }),
    );

    // Agrega el marcador a la capa de marcadores
    marker.addTo(this.markersLayer);
  }

  // Retorna el color hexadecimal según el estado del reporte
  private getColorEstado(estado: string): string {
    switch (estado) {
      case 'PENDIENTE':   return '#f59e0b';   // Naranja
      case 'EN_PROCESO': return '#3b82f6';   // Azul
      case 'FINALIZADO': return '#22c55e';   // Verde
      default:           return '#6c757d';   // Gris
    }
  }


  /*------------------ 10. INTERACCIÓN CON LA INTERFAZ ------------------
    Métodos para manejar la UI y navegación
  */

  // Abre el panel lateral con los detalles del reporte
  abrirDetalle(reporte: Reporte): void {
    this.reporteSeleccionado = reporte;
    this.mostrarDetalle = true;
  }

  // Cierra el panel de detalles
  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.reporteSeleccionado = undefined;
  }

  // Navega a la página de detalle completo del reporte
  navegarADetalle(id: number): void {
    this.router.navigate(['/admin/reporte', id]);
  }

  // Retorna la clase CSS según el estado (para usar en el panel de detalles)
  getClaseEstado(estado: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'estado-pendiente';
      case 'EN_PROCESO': return 'estado-proceso';
      case 'FINALIZADO': return 'estado-finalizado';
      default: return '';
    }
  }

  // Formatea la hora del incidente para mostrar en la UI
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