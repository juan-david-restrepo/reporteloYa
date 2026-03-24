import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Tarea } from '../agente';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tareas',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './tareas.html',
  styleUrl: './tareas.css',
})  


export class Tareas implements OnChanges {



  @Input() tareas!: Tarea[];   // 🔥 ARREGLADO
  @Input() puedeAccion: boolean = true; // Para deshabilitar botones
  @Input() filtroInicial?: 'PENDIENTES' | 'HECHAS' | 'TODAS';

  @Output() comenzar = new EventEmitter<Tarea>();
  @Output() finalizar = new EventEmitter<Tarea>();

  tareaSeleccionada: Tarea | null = null;

  filtro: 'PENDIENTES'|'HECHAS'|'TODAS' = 'PENDIENTES';

    mostrarModal = false;
    mostrarModalResumen = false;
    resumenTexto = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['filtroInicial'] && this.filtroInicial) {
      this.filtro = this.filtroInicial;
    }
  }

  abrir(t: Tarea){
    this.tareaSeleccionada = t;
  }

  cerrar(){
    this.tareaSeleccionada = null;
  }

  comenzarClick(t:Tarea){
    this.comenzar.emit(t);
  }

  abrirModalFinalizar(){
    this.mostrarModal = true;
  }

  confirmarFinalizar(){

    if(!this.tareaSeleccionada) return;

    if(!this.resumenTexto || this.resumenTexto.trim().length < 10){
      return;
    }

    this.tareaSeleccionada.resumenOperativo = this.resumenTexto.trim();

    this.finalizar.emit(this.tareaSeleccionada);

    this.mostrarModal = false;
    this.resumenTexto = '';
  }

  get tareasFiltradas(){

    if(this.filtro === 'PENDIENTES'){
      return this.tareas.filter(t => t.estado !== 'FINALIZADO');
    }

    if(this.filtro === 'HECHAS'){
      return this.tareas.filter(t => t.estado === 'FINALIZADO');
    }

    return this.tareas;
  }

  getDuracion(t:Tarea){

    if(!t.fechaInicio || !t.fechaFin) return '';

    const diff = t.fechaFin.getTime() - t.fechaInicio.getTime();

    const horas = Math.floor(diff / 3600000);
    const minutos = Math.floor((diff % 3600000) / 60000);

    return horas > 0
      ? `${horas}h ${minutos}min`
      : `${minutos} minutos`;
  }


  abrirModalResumen(){
    this.mostrarModalResumen = true;
  }

}