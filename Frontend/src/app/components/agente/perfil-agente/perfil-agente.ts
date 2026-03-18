import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgenteServiceTs } from '../../../service/agente.service';  

@Component({
  selector: 'app-perfil-agente',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './perfil-agente.html',
  styleUrls: ['./perfil-agente.css'],
})
export class PerfilAgente {

  @Input() agente!: {
    nombre: string;
    placa: string;
    foto: string;
    documento: string;
    telefono: string;
    correo: string;
    resumenProfesional1?: string;
    resumenProfesional2?: string;
    resumenProfesional3?: string;
    resumenProfesional4?: string;
  };

  @Input() estadoAgente!: 'DISPONIBLE' | 'OCUPADO' | 'FUERA_SERVICIO';
  @Input() bloquearCambioEstado: boolean = false;

  @Output() estadoChange = new EventEmitter<'DISPONIBLE' | 'FUERA_SERVICIO'>();
  @Output() perfilActualizado = new EventEmitter<any>();

  guardando = false;
  
  editandoCampo: string | null = null;
  
  editData = {
    placa: '',
    telefono: '',
    documento: '',
    nombre: '',
    correo: '',
    resumenProfesional1: '',
    resumenProfesional2: '',
    resumenProfesional3: '',
    resumenProfesional4: ''
  };

  constructor(private agenteService: AgenteServiceTs) {}

  toggleServicio(event: any) {
    const activo = event.target.checked;
    if (activo) {
      this.estadoChange.emit('DISPONIBLE');
    } else {
      this.estadoChange.emit('FUERA_SERVICIO');
    }
  }

  cambiarFoto(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const fotoBase64 = reader.result as string;
      this.agente.foto = fotoBase64;
      
      this.agenteService.actualizarFotoPerfil(fotoBase64).subscribe({
        next: (response) => {
          if (response.foto) {
            this.agente.foto = response.foto;
          }
        },
        error: (err) => {
          console.error('Error guardando foto', err);
          alert('Error al guardar la foto. Intenta de nuevo.');
        }
      });
    };
    reader.readAsDataURL(file);
  }

  iniciarEdicion(campo: string) {
    this.editandoCampo = campo;
    this.editData = {
      placa: this.agente.placa || '',
      telefono: this.agente.telefono || '',
      documento: this.agente.documento || '',
      nombre: this.agente.nombre || '',
      correo: this.agente.correo || '',
      resumenProfesional1: this.agente.resumenProfesional1 || '',
      resumenProfesional2: this.agente.resumenProfesional2 || '',
      resumenProfesional3: this.agente.resumenProfesional3 || '',
      resumenProfesional4: this.agente.resumenProfesional4 || ''
    };
  }

  cancelarEdicion() {
    this.editandoCampo = null;
  }

  guardarCampo(campo: string) {
    if (this.guardando) return;
    
    this.guardando = true;
    
    const datos: any = {};
    
    switch(campo) {
      case 'placa':
        datos.placa = this.editData.placa;
        break;
      case 'telefono':
        datos.telefono = this.editData.telefono;
        break;
      case 'documento':
        datos.documento = this.editData.documento;
        break;
      case 'nombre':
        datos.nombre = this.editData.nombre;
        break;
      case 'correo':
        datos.correo = this.editData.correo;
        break;
      case 'resumen1':
        datos.resumenProfesional1 = this.editData.resumenProfesional1.substring(0, 40);
        break;
      case 'resumen2':
        datos.resumenProfesional2 = this.editData.resumenProfesional2.substring(0, 40);
        break;
      case 'resumen3':
        datos.resumenProfesional3 = this.editData.resumenProfesional3.substring(0, 40);
        break;
      case 'resumen4':
        datos.resumenProfesional4 = this.editData.resumenProfesional4.substring(0, 40);
        break;
    }

    this.agenteService.actualizarPerfil(datos).subscribe({
      next: (response) => {
        if (datos.placa) this.agente.placa = datos.placa;
        if (datos.telefono) this.agente.telefono = datos.telefono;
        if (datos.documento) this.agente.documento = datos.documento;
        if (datos.nombre) this.agente.nombre = datos.nombre;
        if (datos.correo) this.agente.correo = datos.correo;
        if (datos.resumenProfesional1 !== undefined) this.agente.resumenProfesional1 = datos.resumenProfesional1;
        if (datos.resumenProfesional2 !== undefined) this.agente.resumenProfesional2 = datos.resumenProfesional2;
        if (datos.resumenProfesional3 !== undefined) this.agente.resumenProfesional3 = datos.resumenProfesional3;
        if (datos.resumenProfesional4 !== undefined) this.agente.resumenProfesional4 = datos.resumenProfesional4;
        
        this.perfilActualizado.emit(response);
        this.editandoCampo = null;
        this.guardando = false;
      },
      error: (err) => {
        console.error('Error guardando perfil', err);
        alert('Error al guardar. Intenta de nuevo.');
        this.guardando = false;
      }
    });
  }

  getResumenLength(campo: number): number {
    const key = `resumenProfesional${campo}` as keyof typeof this.editData;
    return this.editData[key]?.length || 0;
  }
}
