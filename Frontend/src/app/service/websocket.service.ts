import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {

  private stompClient!: Client;

  // Subjects existentes
  private tareasSubject = new Subject<any>();
  public tareas$ = this.tareasSubject.asObservable();

  private reportesSubject = new Subject<any>();
  public reportes$ = this.reportesSubject.asObservable();

  private estadosAgentesSubject = new Subject<any>();
  public estadosAgentes$ = this.estadosAgentesSubject.asObservable();

  private tareaEstadoSubject = new Subject<any>();
  public tareaEstado$ = this.tareaEstadoSubject.asObservable();

  // ✅ NUEVO: Subject para recibir reportes asignados como compañero
  private reporteAsignadoSubject = new Subject<any>();
  public reporteAsignado$ = this.reporteAsignadoSubject.asObservable();

  connect(placa: string) {

    const socket = new SockJS('http://localhost:8080/ws');

    this.stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000
    });

    this.stompClient.onConnect = () => {

      console.log('✅ WebSocket conectado');

      // Reportes globales (nuevos y actualizaciones de estado)
      this.stompClient.subscribe('/topic/reportes', (msg) => {
        const reporte = JSON.parse(msg.body);
        console.log('📨 Reporte recibido del topic /topic/reportes:', reporte.estado, reporte.direccion);
        this.reportesSubject.next(reporte);
      });

      // Tareas específicas del agente
      this.stompClient.subscribe(`/topic/tareas/${placa}`, (msg) => {
        const tarea = JSON.parse(msg.body);
        this.tareasSubject.next(tarea);
      });

      // Estado de agentes (para el mapa del admin)
      this.stompClient.subscribe('/topic/estado-agentes', (msg) => {
        const estado = JSON.parse(msg.body);
        this.estadosAgentesSubject.next(estado);
      });

      // Actualización de estado de tarea
      this.stompClient.subscribe('/topic/tarea-estado', (msg) => {
        const tarea = JSON.parse(msg.body);
        this.tareaEstadoSubject.next(tarea);
      });

      // ✅ Canal personal del agente para recibir reportes como compañero
      this.stompClient.subscribe(`/topic/reporte-asignado/${placa}`, (msg) => {
        const reporte = JSON.parse(msg.body);
        console.log('📌 Reporte asignado como compañero:', reporte);
        this.reporteAsignadoSubject.next(reporte);
      });

    };

    this.stompClient.activate();
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      console.log('WebSocket desconectado');
    }
  }
}
