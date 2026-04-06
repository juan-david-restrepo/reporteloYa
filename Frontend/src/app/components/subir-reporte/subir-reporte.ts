/*=================================================================
  COMPONENTE: SUBIR REPORTE
  Función: Formulario para que los ciudadanos reporten infracciones
  de tránsito. Incluye selección de tipo, descripción, evidencia
  (fotos/videos), ubicación (geolocalización o manual), y OCR
  para detectar placas de vehículos.
=================================================================*/

/*------------------ IMPORTACIONES ------------------
  Angular Core: Componente, ciclo de vida
  FormsModule: Para formularios con ngModel
  CommonModule: Directivas comunes
  SweetAlert2: Alertas personalizadas
  Leaflet: Mapas interactivos
  Tesseract.js: OCR para detectar placas
  Nav: Componente de navegación
*/
import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import * as L from 'leaflet';
import Tesseract from 'tesseract.js';
import { Nav } from '../../shared/nav/nav';


/*------------------ INTERFAZ INCIDENTE ------------------
  Define los tipos de incidentes disponibles para reportar
*/
interface Incidente {
  nombre: string;              // Nombre del incidente
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA';  // Prioridad del incidente
  requierePlaca: boolean;      // Si requiere placa del vehículo
  icono: string;              // Clase de icono (Font Awesome)
}


/*========================================================
  DECORADOR @COMPONENT
=========================================================*/
@Component({
  selector: 'app-subir-reporte',    // Etiqueta HTML
  standalone: true,                 // Componente independiente
  imports: [FormsModule, Nav, CommonModule],  // Módulos necesarios
  templateUrl: './subir-reporte.html',  // Plantilla HTML
  styleUrls: ['./subir-reporte.css'],   // Estilos CSS
  encapsulation: ViewEncapsulation.None,  // Permite estilos globales
})


/*========================================================
  CLASE PRINCIPAL
=========================================================*/
export class SubirReporteComponent implements OnInit, OnDestroy {

  /*------------------ 1. CONFIGURACIÓN CONSTANTE ------------------*/
  private readonly MAX_FILES = 1;              // Máximo de archivos permitidos
  private readonly MAX_SIZE_MB = 5;            // Tamaño máximo por archivo (MB)
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'video/mp4'];  // Tipos permitidos
  private readonly PLACA_REGEX = /^[A-Z]{3}\d{3}$/;  // Regex para validar placas


  /*------------------ 2. ESTADO DEL FORMULARIO ------------------*/
  fileList: File[] = [];             // Archivos subidos (fotos/videos)
  previewUrls: string[] = [];        // URLs para previsualizar archivos

  placa: string = '';                // Placa del vehículo
  descripcion = '';                  // Descripción del incidente
  fecha = '';                       // Fecha del incidente
  hora = '';                        // Hora del incidente
  direccion = '';                   // Dirección obtenida del mapa
  coordenadas = '';                 // Latitud, longitud

  tipoSeleccionado = '';            // Tipo de incidente seleccionado
  detalleOtroIncidente = '';        // Detalle si selecciona "Otros"
  prioridadInterna: 'BAJA' | 'MEDIA' | 'ALTA' | '' = '';  // Prioridad

  // Estados de la UI
  mostrarCampoOtros = false;         // Mostrar campo de "Otros"
  requierePlacaActual = false;       // Si el incidente requiere placa
  placaOpcional = false;             // Si la placa es opcional
  isSubmitting = false;              // Si está enviando el formulario

  // Validaciones
  fechaInvalida = false;
  fechaErrorMsg = '';
  fechaMaxima = '';                  // Fecha máxima permitida (hoy)
  fechaMinima = '';                  // Fecha mínima permitida (ayer)
  evidenciaRequerida = false;        // Si falta evidencia
  isDragOver = false;                // Si se está arrastrando un archivo
  mostrarModalLegal = false;         // Mostrar modal de aviso legal
  ubicacionManual = '';              // Dirección ingresada manualmente


  /*------------------ 3. ESTADO DEL MODAL (PREVIEW) ------------------*/
  imagenSeleccionada: File | null = null;    // Archivo seleccionado para ver
  urlImagenModal: string | null = null;      // URL para el modal de preview


  /*------------------ 4. DATOS DE REFERENCIA ------------------*/
  // Lista de tipos de incidentes disponibles
  incidentes: Incidente[] = [
    { nombre: 'Accidente de tránsito', prioridad: 'ALTA', requierePlaca: true, icono: 'fas fa-car-crash' },
    { nombre: 'Vehículo mal estacionado', prioridad: 'MEDIA', requierePlaca: true, icono: 'fas fa-car' },
    { nombre: 'Semáforo dañado', prioridad: 'ALTA', requierePlaca: false, icono: 'fas fa-traffic-light' },
    { nombre: 'Conducción peligrosa', prioridad: 'ALTA', requierePlaca: true, icono: 'fas fa-road' },
    { nombre: 'Otros', prioridad: 'BAJA', requierePlaca: false, icono: 'fas fa-ellipsis-h' },
  ];


  /*------------------ 5. PROPIEDADES DEL MAPA ------------------*/
  private map: any;      // Instancia del mapa Leaflet
  private marker: any;   // Marcador de ubicación


  /*------------------ 6. ngOnInit - INICIALIZACIÓN ------------------*/
  ngOnInit(): void {
    this.configurarFechas();
  }


  /*------------------ 7. ngOnDestroy - LIMPIEZA ------------------*/
  ngOnDestroy(): void {
    this.limpiarPreviewUrls();
  }


  /*------------------ 8. CONFIGURACIÓN DE FECHAS ------------------*/
  // Configura las fechas mínima y máxima permitidas (solo hoy o ayer)
  private configurarFechas() {
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    this.fechaMaxima = this.formatearFecha(hoy);
    this.fechaMinima = this.formatearFecha(ayer);
  }

  // Convierte una fecha a formato YYYY-MM-DD
  private formatearFecha(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  /*------------------ 9. LÓGICA DE INCIDENTES ------------------*/
  
  // Se ejecuta al seleccionar un tipo de incidente
  seleccionarIncidente(incidente: Incidente) {
    // Guarda el nombre del incidente seleccionado
    this.tipoSeleccionado = incidente.nombre;

    // Actualiza la UI según el tipo
    this.mostrarCampoOtros = incidente.nombre === 'Otros';
    this.requierePlacaActual = incidente.requierePlaca;
    this.placaOpcional = incidente.nombre === 'Otros';

    // Limpia campos si no aplican
    if (!this.requierePlacaActual && !this.placaOpcional) {
      this.placa = '';
    }

    if (!this.mostrarCampoOtros) {
      this.detalleOtroIncidente = '';
    }
  }


  /*------------------ 10. GESTIÓN DE ARCHIVOS ------------------*/
  
  // Maneja el cambio en el input de archivos
  onFileChange(event: any) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.procesarArchivos(Array.from(input.files));
  }

  // Evento cuando se arrastra un archivo sobre la zona
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  // Evento cuando se sale de la zona de arrastre
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  // Evento cuando se suelta un archivo
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.procesarArchivos(Array.from(files));
    }
  }

  // Valida y procesa los archivos subidos
  private procesarArchivos(nuevos: File[]) {
    for (const file of nuevos) {
      // Verifica el tipo de archivo
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        Swal.fire('Archivo no permitido', 'Solo JPG, PNG o MP4.', 'error');
        continue;
      }

      // Verifica el tamaño
      if (file.size > this.MAX_SIZE_MB * 1024 * 1024) {
        Swal.fire('Archivo muy grande', 'Máximo 5MB por archivo.', 'error');
        continue;
      }

      // Verifica el límite de archivos
      if (this.fileList.length >= this.MAX_FILES) {
        Swal.fire('Límite alcanzado', 'Solo puedes subir 1 archivo (foto o video).', 'warning');
        break;
      }

      // Agrega el archivo a la lista
      this.fileList.push(file);

      // Crea una URL para previsualizar
      const url = URL.createObjectURL(file);
      this.previewUrls.push(url);
    }

    // Si requiere placa, intenta detectarla con OCR
    if (this.requierePlacaActual) this.detectarPlaca();
  }

  // Elimina un archivo de la lista
  removeFile(index: number) {
    URL.revokeObjectURL(this.previewUrls[index]);
    this.previewUrls.splice(index, 1);
    this.fileList.splice(index, 1);
  }

  // Limpia todas las URLs de preview para liberar memoria
  private limpiarPreviewUrls() {
    this.previewUrls.forEach((url) => URL.revokeObjectURL(url));
    this.previewUrls = [];
    if (this.urlImagenModal) URL.revokeObjectURL(this.urlImagenModal);
  }


  /*------------------ 11. MODAL DE PREVIEW ------------------*/
  
  // Abre el modal para ver la imagen en tamaño completo
  abrirModal(file: File) {
    this.imagenSeleccionada = file;
    this.urlImagenModal = URL.createObjectURL(file);
  }

  // Cierra el modal y libera la URL
  cerrarModal() {
    if (this.urlImagenModal) {
      URL.revokeObjectURL(this.urlImagenModal);
    }
    this.imagenSeleccionada = null;
    this.urlImagenModal = null;
  }


  /*------------------ 12. MODAL LEGAL ------------------*/
  
  // Muestra el modal de aviso legal antes de enviar
  mostrarConfirmacion() {
    this.mostrarModalLegal = true;
  }

  // Cierra el modal legal
  cerrarModalLegal() {
    this.mostrarModalLegal = false;
  }


  /*------------------ 13. OCR - DETECCIÓN DE PLACAS ------------------*/
  
  // Usa Tesseract.js para detectar placas en la imagen
  private detectarPlaca() {
    const imagen = this.fileList.find((f) => f.type.startsWith('image'));
    if (!imagen) return;

    const imageUrl = URL.createObjectURL(imagen);
    Tesseract.recognize(imageUrl, 'eng')
      .then(({ data }: any) => {
        // Busca patrones de placas (3 letras + 3 números)
        const matches = data.text.match(/[A-Z]{3}[- ]?\d{3}/);
        if (matches?.[0]) {
          this.placa = matches[0].replace(/[- ]/, '').toUpperCase();
        }
        URL.revokeObjectURL(imageUrl);
      })
      .catch(() => {});
  }


  /*------------------ 14. GEOLOCALIZACIÓN ------------------*/
  
  // Obtiene la ubicación actual del usuario
  obtenerUbicacion() {
    // Verifica si el navegador soporta geolocalización
    if (!navigator.geolocation) {
      Swal.fire('Error', 'Geolocalización no disponible en tu navegador.', 'error');
      return;
    }

    // Muestra mensaje de carga
    Swal.fire({
      title: 'Obteniendo ubicación...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Obtiene la posición
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.coordenadas = `${lat}, ${lng}`;

        Swal.close();

        // Marca la ubicación en el mapa
        await this.marcarUbicacionEnMapa(lat, lng);
      },
      (error) => {
        Swal.close();
        let mensaje = 'No se pudo obtener la ubicación.';
        if (error.code === error.PERMISSION_DENIED) {
          mensaje = 'Permiso de ubicación denegado. Por favor habilítalo en tu navegador.';
        }
        Swal.fire('Error', mensaje, 'error');
      }
    );
  }


  /*------------------ 15. MAPA INTERACTIVO (LEAFLET) ------------------*/
  
  // Inicializa el mapa de Leaflet
  inicializarMapa() {
    if (this.map) return;

    // Crea el mapa centrado en una ubicación por defecto
    this.map = L.map('map', {
      center: [4.5339, -75.6811],
      zoom: 14,
      zoomControl: true,
      attributionControl: false
    });
    
    // Agrega las capas del mapa (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.map);

    // Configura el icono del marcador
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    
    L.Marker.prototype.options.icon = defaultIcon;

    // Evento: al hacer click en el mapa, marca la ubicación
    this.map.on('click', (e: any) => {
      this.marcarUbicacionEnMapa(e.latlng.lat, e.latlng.lng);
    });

    this.map.invalidateSize();
  }

  // Marca una ubicación en el mapa y obtiene la dirección
  async marcarUbicacionEnMapa(lat: number, lng: number) {
    this.ubicacionManual = '';
    this.coordenadas = `${lat}, ${lng}`;

    // Si el mapa no existe, lo crea
    if (!this.map) {
      this.map = L.map('map', {
        center: [4.5339, -75.6811],
        zoom: 16,
        zoomControl: true,
        attributionControl: false
      });
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(this.map);

      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      L.Marker.prototype.options.icon = defaultIcon;

      this.map.on('click', (e: any) => {
        this.marcarUbicacionEnMapa(e.latlng.lat, e.latlng.lng);
      });
    }

    // Centra el mapa en la ubicación
    this.map.setView([lat, lng], 16);

    // Elimina el marcador anterior si existe
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }

    // Agrega el nuevo marcador
    this.marker = L.marker([lat, lng]).addTo(this.map);

    this.map.invalidateSize();

    // Obtiene la dirección a partir de las coordenadas (reverse geocoding)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      );
      const data = await res.json();
      
      const address = data.address;
      let direccionCorta = '';
      
      if (address) {
        const partes: string[] = [];
        
        // Construye la dirección a partir de las partes disponibles
        if (address.road || address.street || address.footway || address.path || address.pedestrian) {
          let calle = address.road || address.street || address.footway || address.path || address.pedestrian || '';
          if (address.house_number) {
            calle += ' #' + address.house_number;
          }
          partes.push(calle);
        }
        
        if (address.neighbourhood || address.suburb || address.quarter || address.hamlet || address.residential || address.village || address.city_district) {
          partes.push(address.neighbourhood || address.suburb || address.quarter || address.hamlet || address.residential || address.village || address.city_district);
        }
        
        if (address.city || address.municipality || address.town || address.village) {
          partes.push(address.city || address.municipality || address.town || address.village);
        }
        
        direccionCorta = partes.filter(p => p && p.trim() !== '').join(' - ');
      }
      
      this.direccion = direccionCorta || data.display_name?.split(',').slice(0, 2).join(' - ') || 'Dirección no encontrada';
    } catch (error) {
      this.direccion = 'No se pudo obtener la dirección';
    }
  }

  // Maneja el cambio en el campo de ubicación manual
  onUbicacionManualChange() {
    if (this.ubicacionManual.trim()) {
      this.direccion = '';
      this.coordenadas = '';
      // Elimina el mapa si existe
      if (this.map) {
        this.map.remove();
        this.map = null;
      }
      if (this.marker) {
        this.marker = null;
      }
    }
  }


  /*------------------ 16. VALIDACIONES ------------------*/
  
  // Valida que la placa tenga el formato correcto (ABC123)
  private validarPlaca(): boolean {
    if (!this.requierePlacaActual && !this.placa) return true;
    if (this.requierePlacaActual && !this.placa) return false;
    return this.placa ? this.PLACA_REGEX.test(this.placa.toUpperCase()) : true;
  }

  // Valida que se haya seleccionado una fecha
  validarFecha(): boolean {
    return !!this.fecha;
  }

  // Valida que se haya seleccionado una hora
  validarHora(): boolean {
    return !!this.hora;
  }

  // Verifica si el formulario completo es válido
  formularioValido(): boolean {
    const tipoFinal =
      this.tipoSeleccionado === 'Otros'
        ? this.detalleOtroIncidente?.trim()
        : this.tipoSeleccionado;
    

    this.evidenciaRequerida = this.fileList.length === 0;
    
    const ubicacionValida = this.direccion || (this.ubicacionManual && this.ubicacionManual.trim().length > 0);
    

    return !!(
      tipoFinal &&
      this.descripcion?.trim().length >= 10 &&
      this.validarFecha() &&
      this.validarHora() &&
      this.validarPlaca()
    );
  }

  campoFaltante: string = '';

  // Retorna el mensaje del primer campo que falta
  obtenerCampoFaltante(): string {
    const tipoFinal =
      this.tipoSeleccionado === 'Otros'
        ? this.detalleOtroIncidente?.trim()
        : this.tipoSeleccionado;

    if (!tipoFinal) return 'Selecciona el tipo de incidente';
    if (!this.descripcion?.trim() || this.descripcion.trim().length < 10) {
      return 'La descripción debe tener al menos 10 caracteres';
    }
    if (!this.validarFecha()) return 'Selecciona la fecha del incidente';
    if (!this.validarHora()) return 'Selecciona la hora del incidente';
    if (!this.validarPlaca()) return 'La placa no es válida (formato: ABC123)';
    
    return '';
  }


  /*------------------ 17. ENVÍO DEL REPORTE ------------------*/
  
  // Envía el reporte al servidor
  async enviarReporte() {
    this.mostrarModalLegal = false;
    this.isSubmitting = true;

    const direccionFinal = this.direccion || this.ubicacionManual;

    // Valida que tenga ubicación
    if (!direccionFinal.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Ubicación requerida',
        text: 'Por favor ingresa o selecciona una ubicación para el reporte.'
      });
      this.isSubmitting = false;
      return;
    }

    try {
      // Crea el FormData con los datos del reporte
      const formData = new FormData();

      formData.append('descripcion', this.descripcion);
      formData.append('direccion', direccionFinal);
      formData.append('latitud', this.coordenadas.split(',')[0] || '0');
      formData.append('longitud', this.coordenadas.split(',')[1] || '0');
      formData.append('placa', this.placa || '');
      formData.append(
        'tipoInfraccion',
        this.tipoSeleccionado === 'Otros'
          ? this.detalleOtroIncidente
          : this.tipoSeleccionado,
      );
      formData.append('fechaIncidente', this.fecha);
      formData.append('horaIncidente', this.hora);

      // Agrega los archivos
      for (let file of this.fileList) {
        formData.append('archivos', file);
      }

      // Envía la petición al servidor
      const response = await fetch('http://localhost:8080/api/reportes/crear', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));

      // Verifica la respuesta
      if (!response.ok) {
        const errorMsg = data.error || 'Error al enviar el reporte';
        throw new Error(errorMsg);
      }

      // Muestra mensaje de éxito
      await Swal.fire({
        icon: 'success',
        title: '¡Reporte enviado!',
        text: 'Tu reporte ha sido recibido y está pendiente de atención.',
        confirmButtonColor: '#1e40af'
      });
      
      this.resetFormulario();
    } catch (error: any) {
      console.error('Error al enviar reporte:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo enviar el reporte. Intenta nuevamente.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      this.isSubmitting = false;
    }
  }

  // Reinicia el formulario a su estado inicial
  resetFormulario() {
    this.limpiarPreviewUrls();
    this.fileList = [];
    this.placa = '';
    this.descripcion = '';
    this.fecha = '';
    this.hora = '';
    this.direccion = '';
    this.coordenadas = '';
    this.ubicacionManual = '';
    this.tipoSeleccionado = '';
    this.prioridadInterna = '';
    this.mostrarCampoOtros = false;
    this.detalleOtroIncidente = '';
    this.requierePlacaActual = false;
    this.placaOpcional = false;
    this.cerrarModal();
  }
}