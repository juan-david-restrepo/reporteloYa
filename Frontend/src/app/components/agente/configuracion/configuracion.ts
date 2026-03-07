import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
 selector: 'app-configuracion',
 standalone: true,
 imports: [FormsModule, CommonModule],
 templateUrl: './configuracion.html',
 styleUrl: './configuracion.css',
})
export class Configuracion {

 @Input() config!: {
  modoNoche:boolean;
  daltonismo:boolean;
  fontSize:number;
 };

 @Output() configChange = new EventEmitter<any>();

 update(){
  this.configChange.emit(this.config);
 }

}