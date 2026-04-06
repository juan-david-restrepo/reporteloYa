import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private stompClient!: Client;
  private connected = false;

  // =========================
  // SUBJECTS
  // =========================

  private tareasSubject = new Subject<any>();
  public tareas$ = this.tareasSubject.asObservable();

  private reportesSubject = new Subject<any>();
  public reportes$ = this.reportesSubject.asObservable();

  private estadosAgentesSubject = new Subject<any>();
  public estadosAgentes$ = this.estadosAgentesSubject.asObservable();

  private tareaEstadoSubject = new Subject<any>();
  public tareaEstado$ = this.tareaEstadoSubject.asObservable();

  private reporteAsignadoSubject = new Subject<any>();
  public reporteAsignado$ = this.reporteAsignadoSubject.asObservable();

  // =========================
  // CONEXIÓN WEBSOCKET
  // =========================

  connect(placa?: string) {
    if (this.connected) {
      return;
    }

    const socket = new SockJS('http://localhost:8080/ws');

    this.stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
     
    });

    this.stompClient.onConnect = () => {
      this.connected = true;

      // =========================
      // SUSCRIPCIONES
      // =========================

      this.subscribeToReports();

      if (placa) {
        this.subscribeAgentChannels(placa);
      }

      this.subscribeAdminChannels();
    };

    this.stompClient.onStompError = (frame) => {
      console.error('❌ Error STOMP:', frame.headers['message']);
      console.error('Detalles:', frame.body);
    };

    this.stompClient.onWebSocketClose = () => {
      this.connected = false;
    };

    this.stompClient.activate();
  }

  // =========================
  // SUSCRIPCIONES
  // =========================

  private subscribeToReports() {
    if (!this.connected) return;

    this.stompClient.subscribe('/topic/reportes', (msg) => {
      const reporte = JSON.parse(msg.body);
      this.reportesSubject.next(reporte);
    });
  }

  private subscribeAdminChannels() {
    if (!this.connected) return;

    this.stompClient.subscribe('/topic/estado-agentes', (msg) => {
      const estado = JSON.parse(msg.body);

      this.estadosAgentesSubject.next(estado);
    });

    this.stompClient.subscribe('/topic/tarea-estado', (msg) => {
      const tarea = JSON.parse(msg.body);

      this.tareaEstadoSubject.next(tarea);
    });
  }

  private subscribeAgentChannels(placa: string) {
    if (!this.connected) return;

    this.stompClient.subscribe(`/topic/tareas/${placa}`, (msg) => {
      const tarea = JSON.parse(msg.body);

      this.tareasSubject.next(tarea);
    });

    this.stompClient.subscribe(`/topic/reporte-asignado/${placa}`, (msg) => {
      const reporte = JSON.parse(msg.body);
      this.reporteAsignadoSubject.next(reporte);
    });
  }

  // =========================
  // DESCONECTAR
  // =========================

  disconnect() {
    if (this.stompClient && this.connected) {
      this.stompClient.deactivate();
      this.connected = false;
    }
  }
}
