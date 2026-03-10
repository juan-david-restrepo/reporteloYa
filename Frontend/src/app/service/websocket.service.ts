import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {

  private stompClient!: Client;

  /** Subjects para emitir tareas y reportes a los componentes interesados */

  private tareasSubject = new Subject<any>();
  public tareas$ = this.tareasSubject.asObservable();

  private reportesSubject = new Subject<any>();
  public reportes$ = this.reportesSubject.asObservable();

  /* para manejar el tema de los estados del agente */
  private estadosAgentesSubject = new Subject<any>();
  public estadosAgentes$ = this.estadosAgentesSubject.asObservable();

  /* para actualizar el estado de la tarea */
  private tareaEstadoSubject = new Subject<any>();
  public tareaEstado$ = this.tareaEstadoSubject.asObservable();

  connect(placa: string) {

    const socket = new SockJS('http://localhost:8080/ws');

    this.stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000
    });

    this.stompClient.onConnect = () => {

      console.log('Conectado al WebSocket');

      /** 🔔 Suscripción a reportes (para el admin o dashboard) */
      this.stompClient.subscribe('/topic/reportes', (msg) => {

        console.log("Reporte recibido:", msg.body);

        const reporte = JSON.parse(msg.body);

        this.reportesSubject.next(reporte);

      });

      /** 📌 Suscripción a tareas específicas del agente */
      this.stompClient.subscribe(`/topic/tareas/${placa}`, (msg) => {

        console.log("Nueva tarea recibida:", msg.body);

        const tarea = JSON.parse(msg.body);

        this.tareasSubject.next(tarea);

      });

      this.stompClient.subscribe('/topic/estado-agentes', (msg) => {

        const estado = JSON.parse(msg.body);

        console.log("Estado agente:", estado);

        this.estadosAgentesSubject.next(estado);

      });

      this.stompClient.subscribe('/topic/tarea-estado', (msg) => {

        const tarea = JSON.parse(msg.body);

        console.log("Estado tarea actualizado:", tarea);

        this.tareaEstadoSubject.next(tarea);

      });

    };

    this.stompClient.activate();
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      console.log("WebSocket desconectado");
    }
  }

}