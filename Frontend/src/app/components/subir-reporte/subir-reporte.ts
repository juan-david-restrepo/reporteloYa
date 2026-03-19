import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import * as L from 'leaflet';
import Tesseract from 'tesseract.js';
import { Nav } from '../../shared/nav/nav';

interface Incidente {
  nombre: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA';
  requierePlaca: boolean;
  icono: string;
}

@Component({
  selector: 'app-subir-reporte',
  standalone: true,
  imports: [FormsModule, Nav, CommonModule],
  templateUrl: './subir-reporte.html',
  styleUrls: ['./subir-reporte.css'],
  encapsulation: ViewEncapsulation.None,
})
export class SubirReporteComponent implements OnInit, OnDestroy {
  // =============================
  // CONFIGURACIÓN CONSTANTE
  // =============================
  private readonly MAX_FILES = 5;
  private readonly MAX_SIZE_MB = 5;
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'video/mp4'];
  private readonly PLACA_REGEX = /^[A-Z]{3}\d{3}$/;

  // =============================
  // ESTADO DEL FORMULARIO
  // =============================
  fileList: File[] = [];
  previewUrls: string[] = [];

  placa: string = '';
  descripcion = '';
  fecha = '';
  hora = '';
  direccion = '';
  coordenadas = '';

  tipoSeleccionado = '';
  detalleOtroIncidente = '';
  prioridadInterna: 'BAJA' | 'MEDIA' | 'ALTA' | '' = '';

  mostrarCampoOtros = false;
  requierePlacaActual = false;
  placaOpcional = false;
  isSubmitting = false;

  fechaInvalida = false;
  fechaErrorMsg = '';
  fechaMaxima = '';
  fechaMinima = '';
  evidenciaRequerida = false;
  isDragOver = false;
  mostrarModalLegal = false;

  // =============================
  // ESTADO DEL MODAL
  // =============================
  imagenSeleccionada: File | null = null;
  urlImagenModal: string | null = null;

  // =============================
  // DATOS DE REFERENCIA
  // =============================
  incidentes: Incidente[] = [
    { nombre: 'Accidente de tránsito', prioridad: 'ALTA', requierePlaca: true, icono: 'fas fa-car-crash' },
    { nombre: 'Vehículo mal estacionado', prioridad: 'MEDIA', requierePlaca: true, icono: 'fas fa-car' },
    { nombre: 'Semáforo dañado', prioridad: 'ALTA', requierePlaca: false, icono: 'fas fa-traffic-light' },
    { nombre: 'Conducción peligrosa', prioridad: 'ALTA', requierePlaca: true, icono: 'fas fa-road' },
    { nombre: 'Otros', prioridad: 'BAJA', requierePlaca: false, icono: 'fas fa-ellipsis-h' },
  ];

  private map: any;
  private marker: any;

  ngOnInit(): void {
    this.configurarFechas();
  }

  ngOnDestroy(): void {
    this.limpiarPreviewUrls();
  }

  private configurarFechas() {
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    this.fechaMaxima = this.formatearFecha(hoy);
    this.fechaMinima = this.formatearFecha(ayer);
  }

  private formatearFecha(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // =============================
  // LÓGICA DE INCIDENTES
  // =============================
  seleccionarIncidente(incidente: Incidente) {
    // Guardamos solo el nombre (lo único que irá al backend)
    this.tipoSeleccionado = incidente.nombre;

    // UI únicamente
    this.mostrarCampoOtros = incidente.nombre === 'Otros';
    this.requierePlacaActual = incidente.requierePlaca;
    this.placaOpcional = incidente.nombre === 'Otros';

    // Limpieza automática de campos
    if (!this.requierePlacaActual && !this.placaOpcional) {
      this.placa = '';
    }

    if (!this.mostrarCampoOtros) {
      this.detalleOtroIncidente = '';
    }
  }

  // =============================
  // GESTIÓN DE ARCHIVOS Y PREVIEW
  // =============================
  onFileChange(event: any) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.procesarArchivos(Array.from(input.files));
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.procesarArchivos(Array.from(files));
    }
  }

  private procesarArchivos(nuevos: File[]) {
    for (const file of nuevos) {
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        Swal.fire('Archivo no permitido', 'Solo JPG, PNG o MP4.', 'error');
        continue;
      }

      if (file.size > this.MAX_SIZE_MB * 1024 * 1024) {
        Swal.fire('Archivo muy grande', 'Máximo 5MB por archivo.', 'error');
        continue;
      }

      if (this.fileList.length >= this.MAX_FILES) {
        Swal.fire('Límite alcanzado', 'Máximo 5 archivos.', 'warning');
        break;
      }

      this.fileList.push(file);

      const url = URL.createObjectURL(file);
      this.previewUrls.push(url);
    }

    if (this.requierePlacaActual) this.detectarPlaca();
  }

  removeFile(index: number) {
    URL.revokeObjectURL(this.previewUrls[index]);
    this.previewUrls.splice(index, 1);
    this.fileList.splice(index, 1);
  }

  private limpiarPreviewUrls() {
    this.previewUrls.forEach((url) => URL.revokeObjectURL(url));
    this.previewUrls = [];
    if (this.urlImagenModal) URL.revokeObjectURL(this.urlImagenModal);
  }

  // =============================
  // LÓGICA DEL MODAL (ZOOM)
  // =============================
  abrirModal(file: File) {
    this.imagenSeleccionada = file;
    // Generamos la URL una sola vez para evitar parpadeos y sobrecarga
    this.urlImagenModal = URL.createObjectURL(file);
  }

  cerrarModal() {
    if (this.urlImagenModal) {
      URL.revokeObjectURL(this.urlImagenModal);
    }
    this.imagenSeleccionada = null;
    this.urlImagenModal = null;
  }

  // =============================
  // OCR Y UBICACIÓN
  // =============================
  private detectarPlaca() {
    const imagen = this.fileList.find((f) => f.type.startsWith('image'));
    if (!imagen) return;

    const imageUrl = URL.createObjectURL(imagen);
    Tesseract.recognize(imageUrl, 'eng')
      .then(({ data }: any) => {
        const matches = data.text.match(/[A-Z]{3}[- ]?\d{3}/);
        if (matches?.[0]) {
          this.placa = matches[0].replace(/[- ]/, '').toUpperCase();
        }
        URL.revokeObjectURL(imageUrl);
      })
      .catch(() => console.warn('Error al procesar OCR'));
  }

  obtenerUbicacion() {
    if (!navigator.geolocation) {
      Swal.fire('Error', 'Geolocalización no disponible en tu navegador.', 'error');
      return;
    }

    Swal.fire({
      title: 'Obteniendo ubicación...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.coordenadas = `${lat}, ${lng}`;

        Swal.close();

        await new Promise(resolve => setTimeout(resolve, 200));

        if (!this.map) {
          this.map = L.map('map', {
            center: [lat, lng],
            zoom: 16,
            zoomControl: true,
            attributionControl: false
          });
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(this.map);
        }

        this.map.setView([lat, lng], 16);

        if (this.marker) {
          this.map.removeLayer(this.marker);
        }

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
        
        this.marker = L.marker([lat, lng], {
          draggable: false
        }).addTo(this.map);

        this.map.invalidateSize();

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          );
          const data = await res.json();
          this.direccion = data.display_name || 'Dirección no encontrada';
        } catch (error) {
          this.direccion = 'No se pudo obtener la dirección';
        }
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

  // =============================
  // VALIDACIONES Y ENVÍO
  // =============================
  private validarPlaca(): boolean {
    if (!this.requierePlacaActual && !this.placa) return true;
    if (this.requierePlacaActual && !this.placa) return false;
    return this.placa ? this.PLACA_REGEX.test(this.placa.toUpperCase()) : true;
  }

  validarFecha(): boolean {
    if (!this.fecha || !this.hora) {
      this.fechaInvalida = false;
      this.fechaErrorMsg = '';
      return false;
    }

    const ahora = new Date();
    const seleccionada = new Date(`${this.fecha}T${this.hora}`);
    const diffMs = ahora.getTime() - seleccionada.getTime();
    const diffHoras = diffMs / (1000 * 60 * 60);

    if (seleccionada > ahora) {
      this.fechaInvalida = true;
      this.fechaErrorMsg = 'La fecha no puede ser futura';
      return false;
    }

    if (diffHoras > 24) {
      this.fechaInvalida = true;
      this.fechaErrorMsg = 'El reporte debe hacerse dentro de las primeras 24 horas';
      return false;
    }

    this.fechaInvalida = false;
    this.fechaErrorMsg = '';
    return true;
  }

  private validarFechaHora(): boolean {
    return this.validarFecha();
  }

  mostrarConfirmacion() {
    if (!this.formularioValido()) {
      if (this.evidenciaRequerida) {
        Swal.fire(
          'Evidencia requerida',
          'Por favor adjunta al menos una foto o video como evidencia.',
          'warning',
        );
        return;
      }
      Swal.fire(
        'Formulario incompleto',
        'Revisa los campos obligatorios.',
        'warning',
      );
      return;
    }
    this.mostrarModalLegal = true;
  }

  cerrarModalLegal() {
    this.mostrarModalLegal = false;
  }

  formularioValido(): boolean {
    const tipoFinal =
      this.tipoSeleccionado === 'Otros'
        ? this.detalleOtroIncidente?.trim()
        : this.tipoSeleccionado;
    
    this.evidenciaRequerida = this.fileList.length === 0;
    
    return !!(
      tipoFinal &&
      this.descripcion?.trim().length >= 10 &&
      this.validarFecha() &&
      !this.fechaInvalida &&
      this.validarPlaca() &&
      this.fileList.length > 0
    );
  }

  async enviarReporte() {
    this.mostrarModalLegal = false;
    this.isSubmitting = true;

    try {
      const formData = new FormData();

      formData.append('descripcion', this.descripcion);
      formData.append('direccion', this.direccion);
      formData.append('latitud', this.coordenadas.split(',')[0]);
      formData.append('longitud', this.coordenadas.split(',')[1]);
      formData.append('placa', this.placa);
       formData.append(
         'tipoInfraccion',
         this.tipoSeleccionado === 'Otros'
           ? this.detalleOtroIncidente
           : this.tipoSeleccionado,
       );
      formData.append('fechaIncidente', this.fecha);
      formData.append('horaIncidente', this.hora);

     

      for (let file of this.fileList) {
        formData.append('archivos', file);
      }

      const response = await fetch('http://localhost:8080/api/reportes/crear', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Error en servidor');

      await Swal.fire({
        icon: 'success',
        title: 'Reporte enviado correctamente',
      });
      this.resetFormulario();
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Error al enviar reporte' });
    } finally {
      this.isSubmitting = false;
    }
  }

  resetFormulario() {
    this.limpiarPreviewUrls();
    this.fileList = [];
    this.placa = '';
    this.descripcion = '';
    this.fecha = '';
    this.hora = '';
    this.direccion = '';
    this.coordenadas = '';
    this.tipoSeleccionado = '';
    this.prioridadInterna = '';
    this.mostrarCampoOtros = false;
    this.detalleOtroIncidente = '';
    this.requierePlacaActual = false;
    this.placaOpcional = false;
    this.cerrarModal();
  }
}