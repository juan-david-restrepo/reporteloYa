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

  // =============================
  // ESTADO DEL MODAL
  // =============================
  imagenSeleccionada: File | null = null;
  urlImagenModal: string | null = null;

  // =============================
  // DATOS DE REFERENCIA
  // =============================
  incidentes: Incidente[] = [
    { nombre: 'Accidente de tránsito', prioridad: 'ALTA', requierePlaca: true },
    {
      nombre: 'Vehículo mal estacionado',
      prioridad: 'MEDIA',
      requierePlaca: true,
    },
    { nombre: 'Semáforo dañado', prioridad: 'ALTA', requierePlaca: false },
    { nombre: 'Conducción peligrosa', prioridad: 'ALTA', requierePlaca: true },
    { nombre: 'Otros', prioridad: 'BAJA', requierePlaca: false },
  ];

  private map: any;
  private marker: any;

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.limpiarPreviewUrls();
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

    const nuevos = Array.from(input.files);

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

      // 🔥 GENERAR PREVIEW UNA SOLA VEZ
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
      Swal.fire('Error', 'Geolocalización no disponible.', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.coordenadas = `${lat}, ${lng}`;

        if (!this.map) {
          this.map = L.map('map').setView([lat, lng], 16);
          L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          ).addTo(this.map);
        }

        if (this.marker) this.marker.setLatLng([lat, lng]);
        else this.marker = L.marker([lat, lng]).addTo(this.map);

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        );
        const data = await res.json();
        this.direccion = data.display_name || '';
      },
      () => Swal.fire('Error', 'No se pudo obtener la ubicación.', 'error'),
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

  private validarFechaHora(): boolean {
    if (!this.fecha || !this.hora) return false;
    const ahora = new Date();
    const seleccionada = new Date(`${this.fecha}T${this.hora}`);
    return seleccionada <= ahora;
  }

  formularioValido(): boolean {
    const tipoFinal =
      this.tipoSeleccionado === 'Otros'
        ? this.detalleOtroIncidente?.trim()
        : this.tipoSeleccionado;
    return !!(
      tipoFinal &&
      this.descripcion?.trim().length >= 10 &&
      this.validarFechaHora() &&
      this.validarPlaca()
    );
  }

  async enviarReporte() {
    if (!this.formularioValido()) {
      await Swal.fire(
        'Formulario incompleto',
        'Revisa los campos obligatorios.',
        'warning',
      );
      return;
    }

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