import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {

  private stompClient!: Client;

  private reportesSubject = new Subject<any>();
  public reportes$ = this.reportesSubject.asObservable();

  connect() {

    const socket = new SockJS('http://localhost:8080/ws');

    this.stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000
    });

    this.stompClient.onConnect = () => {

      console.log('Conectado al WebSocket');

      this.stompClient.subscribe('/topic/reportes', (msg) => {

        console.log("Mensaje recibido:", msg.body);

        const reporte = JSON.parse(msg.body);

        this.reportesSubject.next(reporte);
      });

    };

    this.stompClient.activate();
  }

  disconnect(){
    if(this.stompClient){
      this.stompClient.deactivate();
      console.log("WebSocket desconectado");
    }
  }

}