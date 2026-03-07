import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js/auto';

@Component({
 selector: 'app-dashboard',
 standalone: true,
 imports: [FormsModule, CommonModule],
 templateUrl: './dashboard.html',
 styleUrl: './dashboard.css',
})
export class Dashboard implements AfterViewInit {

  

 @Input() estadoAgente!:string;

  chart!: Chart;
   tipoGrafica: 'bar' | 'line' | 'pie' = 'bar';   

 modoGrafica:'SEMANA'|'ANIO'|'DIA'='SEMANA';

  ngAfterViewInit() {
    this.crearGrafica();
  }

 fechaSeleccionada='';


  cambiarTipoGrafica(tipo:'bar'|'line'|'pie'){
  this.tipoGrafica = tipo;
  this.crearGrafica();
  }


 get maxValor() {
  return Math.max(...this.statsActual.map(s => s.valor));
}

get statsNormalizados() {
  const max = this.maxValor;
  return this.statsActual.map(s => ({
    ...s,
    porcentaje: (s.valor / max) * 100
  }));
}


fechaInicio = '';
fechaFin = '';

filtrarPorRango(){
  console.log('Filtrar desde', this.fechaInicio, 'hasta', this.fechaFin);
  // aquí luego puedes conectar con backend
}

statsSemana=[
 {label:'Lun',valor:40},
 {label:'Mar',valor:70},
 {label:'Mie',valor:30},
 {label:'Jue',valor:90},
 {label:'Vie',valor:60},
 {label:'Sab',valor:20},
 {label:'Dom',valor:50}
];

statsAnio=[
 {label:'Ene',valor:120},
 {label:'Feb',valor:90},
 {label:'Mar',valor:150},
 {label:'Abr',valor:70},
 {label:'May',valor:180},
 {label:'Jun',valor:140},
 {label:'Jul',valor:200},
 {label:'Ago',valor:160},
 {label:'Sep',valor:130},
 {label:'Oct',valor:170},
 {label:'Nov',valor:110},
 {label:'Dic',valor:190}
];

statsDia=[
 {label:'00',valor:5},
 {label:'06',valor:15},
 {label:'12',valor:25},
 {label:'18',valor:10}
];
 get statsActual(){
  if(this.modoGrafica==='SEMANA') return this.statsSemana;
  if(this.modoGrafica==='ANIO') return this.statsAnio;
  return this.statsDia;
 }

 cambiarModoGrafica(modo:'SEMANA'|'ANIO'|'DIA'){
    this.modoGrafica = modo;
  this.crearGrafica();
 }


crearGrafica() {

  const ctx = document.getElementById('miGrafica') as HTMLCanvasElement;

  if (this.chart) {
    this.chart.destroy();
  }

  this.chart = new Chart(ctx, {
    type: this.tipoGrafica,
    data: {
      labels: this.statsActual.map(s => s.label),
      datasets: [{
        label: 'Cantidad',
        data: this.statsActual.map(s => s.valor),
        backgroundColor: [
          '#3b82f6',
          '#1d4ed8',
          '#60a5fa',
          '#2563eb',
          '#93c5fd',
          '#0ea5e9',
          '#6366f1',
          '#8b5cf6',
          '#06b6d4',
          '#14b8a6',
          '#10b981',
          '#84cc16'
        ],
        borderRadius: 8,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}


}