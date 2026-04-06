import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConsultaMultasService, DatosConsulta, ResultadoMultas, Multa } from '../../service/consulta-multas.service';
import { Nav } from '../../shared/nav/nav';
import { Footer } from '../../shared/footer/footer';

@Component({
  selector: 'app-consulta-multas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Nav, Footer],
  templateUrl: './consulta-multas.html',
  styleUrl: './consulta-multas.css'
})
export class ConsultaMultas implements OnInit {
  tipoDocumento: string = 'CC';
  numeroDocumento: string = '';
  
  datosConsulta: DatosConsulta | null = null;
  sessionId: string | null = null;
  resultado: ResultadoMultas | null = null;
  
  mostrarLoading: boolean = false;
  mostrarResultado: boolean = false;
  mostrarError: boolean = false;
  mensajeError: string = '';
  
  progreso: number = 0;
  textoProgreso: string = '';
  
  headerClass: string = 'result-header';
  headerIcon: string = '';
  headerTitle: string = '';
  
  htmlResultado: string = '';
  mostrarPdfModal: boolean = false;

  constructor(private consultaMultasService: ConsultaMultasService) {}

  ngOnInit(): void {}

  enviarFormulario(): void {
    const numero = this.numeroDocumento.trim();

    if (!numero) {
      this.mostrarErrorMensaje('Por favor ingrese el número de documento');
      return;
    }

    if (!/^\d+$/.test(numero)) {
      this.mostrarErrorMensaje('El número de documento solo debe contener números');
      return;
    }

    if (numero.length < 5) {
      this.mostrarErrorMensaje('El número de documento debe tener al menos 5 dígitos');
      return;
    }

    this.datosConsulta = { tipo: 'documento', tipoDoc: this.tipoDocumento, valor: numero };
    this.realizarConsulta(this.datosConsulta);
  }

  async realizarConsulta(datos: DatosConsulta): Promise<void> {
    this.mostrarLoading = true;
    this.mostrarResultado = false;
    this.mostrarError = false;
    this.mostrarPdfModal = false;
    this.actualizarProgreso(20, 'Conectando con SIMIT...');

    this.consultaMultasService.consultarMultas(datos).subscribe({
      next: (resultado) => {
        this.actualizarProgreso(70, 'Procesando datos...');
        
        if (resultado.error || (resultado.mensaje && resultado.mensaje.toLowerCase().includes('error'))) {
          throw new Error(resultado.mensaje || resultado.error || 'Error en la consulta');
        }

        this.sessionId = resultado.sessionId || null;
        this.resultado = resultado;

        this.actualizarProgreso(100, 'Completado');
        
        setTimeout(() => {
          this.mostrarLoading = false;
          this.mostrarResultados(resultado);
        }, 300);
      },
      error: (error) => {
        console.error('Error:', error);
        this.mostrarLoading = false;
        let mensaje = 'Error al conectar con el servidor';
        if (error.error && error.error.mensaje) {
          mensaje = error.error.mensaje;
        } else if (error.message) {
          mensaje = error.message;
        }
        this.mostrarErrorMensaje(mensaje);
      }
    });
  }

  actualizarProgreso(porcentaje: number, texto: string): void {
    this.progreso = porcentaje;
    this.textoProgreso = texto;
  }

  mostrarResultados(datos: ResultadoMultas): void {
    this.mostrarResultado = true;
    this.mostrarError = false;

    const multas = datos.multas || [];
    const totales = datos.totales || {};
    const tieneDeudas = datos.tieneDeudas ?? multas.length > 0;

    this.headerClass = tieneDeudas ? 'result-header con-deudas' : 'result-header sin-deudas';
    this.headerIcon = tieneDeudas ? 'fa-exclamation-triangle' : 'fa-check-circle';
    this.headerTitle = tieneDeudas ? 'Comparendos Encontrados' : 'Sin Deudas';

    let html = '';

    if (datos.infoExtra && (datos.infoExtra.nombre || datos.infoExtra.numeroDocumento)) {
      html += `
        <div class="info-consulta">
          <div class="info-consulta-item">
            <span class="info-label">Tipo Documento</span>
            <span class="info-value">${datos.infoExtra.tipoDocumento || '-'}</span>
          </div>
          <div class="info-consulta-item">
            <span class="info-label">Número</span>
            <span class="info-value">${datos.infoExtra.numeroDocumento || '-'}</span>
          </div>
          ${datos.infoExtra.nombre ? `
          <div class="info-consulta-item full">
            <span class="info-label">Nombre</span>
            <span class="info-value">${datos.infoExtra.nombre}</span>
          </div>
          ` : ''}
        </div>
      `;
    }

    if (multas.length > 0) {
      html += `
        <div class="resumen-card">
          <div class="resumen-item">
            <span class="resumen-label">Total Comparendos</span>
            <span class="resumen-value">${totales.totalMultas || multas.length}</span>
          </div>
          <div class="resumen-item principal">
            <span class="resumen-label">Valor Total a Pagar</span>
            <span class="resumen-value">${this.formatCurrency(totales.valorTotal || 0)}</span>
          </div>
        </div>
      `;

      html += '<div class="multas-list">';
      multas.forEach((multa: Multa, index: number) => {
        html += this.crearTarjetaMulta(multa, index + 1);
      });
      html += '</div>';
    } else {
      html = `
        <div class="sin-multas">
          <i class="fas fa-check-circle"></i>
          <h3>¡Sin Multas!</h3>
          <p>No se encontraron multas ni comparendos registrados para este documento.</p>
          ${datos.alternativas && datos.alternativas.length > 0 ? `
          <div class="alternativas">
            <p><strong>¿Crees que debería tener multas?</strong></p>
            <ul>
              ${datos.alternativas.map(alt => `<li>${alt}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
      `;
    }

    this.htmlResultado = html;
  }

  crearTarjetaMulta(multa: Multa, numero: number): string {
    return `
      <div class="multa-card">
        <div class="multa-header">
          <span class="multa-codigo">Comparendo #${numero}</span>
          <span class="multa-fecha">
            <i class="far fa-calendar"></i>
            ${multa.fechaComparendo || 'Sin fecha'}
          </span>
        </div>
        <div class="multa-body">
          <div class="multa-grid">
            <div class="multa-item">
              <label>Número</label>
              <span>${multa.comparendo || 'N/A'}</span>
            </div>
            <div class="multa-item">
              <label>Estado</label>
              <span class="estado-badge-small ${this.getEstadoClass(multa.estado)}">${multa.estado || 'N/A'}</span>
            </div>
            ${multa.secretaria ? `
            <div class="multa-item full">
              <label>Secretaría</label>
              <span>${multa.secretaria}</span>
            </div>
            ` : ''}
            ${multa.resolucion ? `
            <div class="multa-item">
              <label>Resolución</label>
              <span>${multa.resolucion}</span>
            </div>
            ` : ''}
            ${multa.fechaResolucion ? `
            <div class="multa-item">
              <label>Fecha Resolución</label>
              <span>${multa.fechaResolucion}</span>
            </div>
            ` : ''}
            ${multa.nombreInfractor ? `
            <div class="multa-item full">
              <label>Infractor</label>
              <span>${multa.nombreInfractor}</span>
            </div>
            ` : ''}
            ${multa.placa ? `
            <div class="multa-item">
              <label>Placa</label>
              <span>${multa.placa}</span>
            </div>
            ` : ''}
            ${multa.ciudad ? `
            <div class="multa-item">
              <label>Ciudad</label>
              <span>${multa.ciudad}</span>
            </div>
            ` : ''}
          </div>
          <div class="multa-valores">
            <div class="valor-item">
              <span class="valor-label">Valor Multa</span>
              <span class="valor-amount">${this.formatCurrency(multa.valorMulta)}</span>
            </div>
            <div class="valor-item">
              <span class="valor-label">Intereses</span>
              <span class="valor-amount">${this.formatCurrency(multa.interesMora)}</span>
            </div>
            <div class="valor-item">
              <span class="valor-label">Adicional</span>
              <span class="valor-amount">${this.formatCurrency(multa.valorAdicional)}</span>
            </div>
            <div class="valor-item total">
              <span class="valor-label">TOTAL</span>
              <span class="valor-amount">${this.formatCurrency(multa.valorTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getEstadoClass(estado: string | undefined): string {
    if (!estado) return '';
    const e = estado.toLowerCase();
    if (e.includes('cobro') || e.includes('pendiente') || e.includes('acta') || e.includes('sin')) return 'estado-pendiente';
    if (e.includes('pago') || e.includes('cancelado') || e.includes('salvo') || e.includes('parcial')) return 'estado-pagado';
    return '';
  }

  formatCurrency(valor: number | undefined): string {
    if (!valor || valor === 0) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  mostrarErrorMensaje(mensaje: string): void {
    this.mostrarResultado = false;
    this.mostrarError = true;
    this.mensajeError = mensaje;
  }

  nuevaConsulta(): void {
    this.mostrarResultado = false;
    this.mostrarError = false;
    this.mostrarPdfModal = false;
    this.numeroDocumento = '';
    this.datosConsulta = null;
    this.sessionId = null;
    this.resultado = null;
    this.htmlResultado = '';
  }

  limpiarResultados(): void {
    this.mostrarResultado = false;
    this.htmlResultado = '';
  }

  generarPDF(): void {
    if (!this.datosConsulta && !this.sessionId) {
      alert('No hay datos para generar PDF');
      return;
    }

    this.mostrarPdfModal = true;

    this.consultaMultasService.generarPDF(this.sessionId || '', this.datosConsulta!).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simit_${this.datosConsulta?.valor || 'consulta'}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error al generar PDF:', error);
        alert('Error al generar el PDF: ' + (error.message || 'Error desconocido'));
      },
      complete: () => {
        this.mostrarPdfModal = false;
      }
    });
  }

  cerrarPdfModal(): void {
    this.mostrarPdfModal = false;
  }
}
