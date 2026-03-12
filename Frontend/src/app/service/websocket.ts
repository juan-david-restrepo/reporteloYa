import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Subject } from 'rxjs';
import SockJS from 'sockjs-client';


export interface Report {
  id: number;
  description: string;
  agentId: number;
}

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private stompClient!: Client;
  private connected = false;

  private reportesSubject = new Subject<any>();
  public reportes$ = this.reportesSubject.asObservable();

  public adminReports$ = new BehaviorSubject<Report | null>(null);
  public agentReports$ = new BehaviorSubject<Report | null>(null);

  public connected$ = new BehaviorSubject<boolean>(false);

  connect() {
    const socket = new SockJS('http://localhost:8080/ws');

    this.stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      debug: (str) => console.log(str),
    });

    this.stompClient.onConnect = () => {
      console.log('Conectado al WebSocket');

      this.stompClient.activate();
    };
  }

  subscribeAsAdmin() {
    this.stompClient.subscribe('/topic/admins', (message) => {
      const report = JSON.parse(message.body);
      this.adminReports$.next(report);
    });
  }

  subscribeAsAgent() {
    this.stompClient.subscribe('/topic/agents', (message) => {
      const report = JSON.parse(message.body);
      this.agentReports$.next(report);
    });
  }

  subscribeToReports() {
    this.stompClient.subscribe('/topic/reportes', (message) => {
      const reporte = JSON.parse(message.body);

      console.log('Reporte recibido:', reporte);

      this.reportesSubject.next(reporte);
    });
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.connected = false;
    }
  }
}
