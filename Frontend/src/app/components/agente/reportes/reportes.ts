import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Reporte, EstadoReporte } from '../agente';

import { trigger, transition, style, animate } from '@angular/animations';





@Component({
 selector: 'app-reportes',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './reportes.html',
 styleUrls: ['./reportes.css'],
 animations: [
  trigger('fadeInOut', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(10px)' }),
      animate('200ms ease-out',
        style({ opacity: 1, transform: 'translateY(0)' }))
    ]),
    transition(':leave', [
      animate('150ms ease-in',
        style({ opacity: 0, transform: 'translateY(10px)' }))
    ])
  ])
]
})
export class Reportes {



    mostrarModalAceptar = false;
    modoAceptacion: 'solo' | 'acompanado' | null = null;
    placaBusqueda = '';
    companeroEncontrado: any = null;
    reporteTemporal: Reporte | null = null;

    @Input() hayEnProceso: boolean = false;

    EstadoReporte = EstadoReporte;

    mostrarImagenZoom = false;
    imagenZoomUrl: string | null = null;
    zoomScale = 1;

    mostrarModalResumen = false;

    abrirModalResumen(){
        this.mostrarModalResumen = true;
    }

    fechaRechazado?: Date;

    @Input() origen: 'historial' | 'reportes' = 'reportes';
    @Output() volver = new EventEmitter<'historial' | 'reportes'>();

    @Input() modoLectura: boolean = false;

    @Input() reporteInicial: Reporte | null = null;

    constructor(private sanitizer: DomSanitizer){}
    mapaUrl: SafeResourceUrl | null = null;

    @Input() reportes!: Reporte[];
    @Input() historial!: Reporte[];

    @Output() aceptar = new EventEmitter<Reporte>();
    @Output() rechazar = new EventEmitter<Reporte>();
    @Output() finalizar = new EventEmitter<Reporte>();

    volverClick(){
        if(this.origen === 'historial'){
            this.volver.emit('historial');
        } else {
            // Si venimos desde reportes normales
            this.reporteSeleccionado = null;
        }
    }

    reporteSeleccionado: Reporte | null = null;

    seleccionar(r: Reporte){
        this.reporteSeleccionado = r;

        if (r.lat && r.lng) {
            const url = `https://www.google.com/maps?q=${r.lat},${r.lng}&hl=es&z=16&output=embed`;
            this.mapaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        } else {
            this.mapaUrl = null;
        }
    }

    aceptarClick(r: Reporte){
        if(this.hayEnProceso){
            this.mostrarAlerta('Ya tienes un reporte en proceso');
            return;
        }

        this.reporteTemporal = r;
        this.mostrarModalAceptar = true;
    }

    rechazarClick(r: Reporte){
        if(this.hayEnProceso){
            this.mostrarAlerta('No puedes rechazar mientras tienes uno en proceso');
            return;
        }

        this.rechazar.emit(r);
        this.reporteSeleccionado = null;
    }

    getMapaUrl(r: Reporte): SafeResourceUrl {
        if(!r.lat || !r.lng) return '';
        const url = `https://www.google.com/maps?q=${r.lat},${r.lng}&hl=es&z=16&output=embed`;
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    getDuracion(r: Reporte){
        if(!r.fechaAceptado || !r.fechaFinalizado) return '';

        const diff = r.fechaFinalizado.getTime() - r.fechaAceptado.getTime();

        const horas = Math.floor(diff / 3600000);
        const minutos = Math.floor((diff % 3600000) / 60000);

        if(horas > 0){
            return `${horas}h ${minutos}min`;
        }

        return `${minutos} minutos`;
    }

    ngOnChanges() {
        if (this.reporteInicial) {
            this.seleccionar(this.reporteInicial);
        }
    }

    get reportesOrdenados(){
        return [...this.reportes].sort((a,b)=>{
            if(a.estado === EstadoReporte.EN_PROCESO) return -1;
        if(b.estado === EstadoReporte.EN_PROCESO) return 1;
            return 0;
        })
    }

    mostrarModal = false;
    resumenTexto = '';

    abrirModalFinalizar(){
        this.mostrarModal = true;
    }

    confirmarFinalizar(){
        if(!this.reporteSeleccionado) return;

        //  Validación
        if(!this.resumenTexto || this.resumenTexto.trim().length < 10){
            this.mostrarAlerta('Debes escribir un resumen mínimo de 10 caracteres');
            return;
        }

        this.reporteSeleccionado.estado = EstadoReporte.FINALIZADO;
        this.reporteSeleccionado.fechaFinalizado = new Date();
        this.reporteSeleccionado.resumenOperativo = this.resumenTexto.trim();

        this.finalizar.emit(this.reporteSeleccionado);

        this.mostrarModal = false;
        this.resumenTexto = '';
        this.reporteSeleccionado = null;

    }

    abrirZoom(url: string){
        this.imagenZoomUrl = url;
        this.mostrarImagenZoom = true;
    }

    cerrarZoom(){
        this.mostrarImagenZoom = false;
        this.imagenZoomUrl = null;
        this.zoomScale = 1;
    }

    zoomConRueda(event: WheelEvent){
        event.preventDefault();

        if(event.deltaY < 0){
            this.zoomScale += 0.1;
        } else {
            this.zoomScale -= 0.1;
        }

        if(this.zoomScale < 1) this.zoomScale = 1;
        if(this.zoomScale > 3) this.zoomScale = 3;
    }

    /*Filtros*/

    filtroActivo: 'TODOS'|'BAJA'|'MEDIA'|'ALTA' = 'TODOS';

    cambiarFiltro(filtro:'TODOS'|'BAJA'|'MEDIA'|'ALTA'){
        this.filtroActivo = filtro;
    }

    get reportesFiltrados(){
    if(this.filtroActivo === 'TODOS'){
        return this.reportesOrdenados;
    }

    return this.reportesOrdenados.filter(r =>
        r.etiqueta.toUpperCase() === this.filtroActivo
    );
    }

    /*Prioridad dinamico*/
    
    getClasePrioridad(etiqueta:string){
        switch(etiqueta.toLowerCase()){
            case 'alta': return 'prioridad-alta';
            case 'media': return 'prioridad-media';
            case 'baja': return 'prioridad-baja';
            default: return '';
        }
    }

    /*Confirmacion*/

    mensajeAlerta: string | null = null;

        mostrarAlerta(msg:string){
        this.mensajeAlerta = msg;

        setTimeout(()=>{
            this.mensajeAlerta = null;
        },3000);
    }

    buscarCompanero(){
        // Simulación (luego lo haces con servicio real)
        if(this.placaBusqueda === 'ANT-9022'){
            this.companeroEncontrado = {
            nombre: 'Carlos Pérez',
            placa: 'ANT-9022'
            };
        } else {
            this.companeroEncontrado = null;
            this.mostrarAlerta('No se encontró agente con esa placa');
        }
    }

    confirmarAceptar(){

        if(!this.reporteTemporal) return;

        if(!this.modoAceptacion){
            this.mostrarAlerta('Selecciona una opción');
            return;
        }

        if(this.modoAceptacion === 'acompanado' && !this.companeroEncontrado){
            this.mostrarAlerta('Debes seleccionar un compañero');
            return;
        }

        const reporte = this.reporteTemporal;

        reporte.acompanado = this.modoAceptacion === 'acompanado';

        if(reporte.acompanado){
            reporte.placaCompanero = this.companeroEncontrado.placa;
        }

        this.aceptar.emit(reporte);

        this.cerrarModalAceptar();
    }

    cerrarModalAceptar(){
        this.mostrarModalAceptar = false;
        this.modoAceptacion = null;
        this.placaBusqueda = '';
        this.companeroEncontrado = null;
        this.reporteTemporal = null;
    }



}