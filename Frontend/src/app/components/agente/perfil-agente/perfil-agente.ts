import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SidebarAgente } from '../sidebar-agente/sidebar-agente';
import { CommonModule } from '@angular/common';
import { AgenteServiceTs } from '../../../service/agente.service';  

@Component({
  selector: 'app-perfil-agente',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './perfil-agente.html',
  styleUrls: ['./perfil-agente.css'],
})
export class PerfilAgente {

@Input() agente!: {
 nombre:string;
 placa:string;
 foto:string;
 documento:string;
 telefono:string;
 correo:string;
};

  @Input() estadoAgente!: 'LIBRE'|'OCUPADO'|'FUERA_SERVICIO';
  @Input() bloquearCambioEstado: boolean = false;

  @Output() estadoChange = new EventEmitter<'LIBRE'|'FUERA_SERVICIO'>();


  cambiarEstado(event: any){
    this.estadoChange.emit(event);
  }

  constructor(private agenteService: AgenteServiceTs) {}

  toggleServicio(event: any) {

    const activo = event.target.checked;

    if (activo) {
      this.estadoChange.emit('LIBRE');
    } else {
      this.estadoChange.emit('FUERA_SERVICIO');
    }

  }


cambiarFoto(event: any) {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    this.agente.foto = reader.result as string;
  };

  reader.readAsDataURL(file);
}


}
