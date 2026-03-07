import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject } from 'rxjs';

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

  public adminReports$ = new BehaviorSubject<Report | null>(null);
  public agentReports$ = new BehaviorSubject<Report | null>(null);

  public connected$ = new BehaviorSubject<boolean>(false);

  connect() {
this.stompClient = new Client({
  brokerURL: 'ws://localhost:8080/ws', // WebSocket puro
  reconnectDelay: 5000,
  debug: (str) => console.log(str),
  // key para cookies:
  webSocketFactory: () => {
    const socket = new WebSocket('ws://localhost:8080/ws');
    return socket;
  },
});

    this.stompClient.onConnect = () => {
      console.log('Conectado al WebSocket');
     
    };

    this.stompClient.activate();
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

  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.connected = false;
    }
  }
}
