import { Injectable, OnDestroy } from '@angular/core';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';
import { TicketSoporte, NotificacionSoporte } from '../models/soporte.model';

@Injectable({
  providedIn: 'root'
})
export class SoporteWebSocketService implements OnDestroy {
  private stompClient: Client | null = null;
  private notificationsSubject = new Subject<NotificacionSoporte>();
  private nuevosTicketsSubject = new Subject<TicketSoporte>();
  private ticketUpdatesSubject = new Subject<TicketSoporte>();
  
  public notifications$: Observable<NotificacionSoporte> = this.notificationsSubject.asObservable();
  public nuevosTickets$: Observable<TicketSoporte> = this.nuevosTicketsSubject.asObservable();
  public ticketUpdates$: Observable<TicketSoporte> = this.ticketUpdatesSubject.asObservable();

  private userId: string | null = null;
  private connected = false;

  connectUser(userId: string): void {
    if (this.connected && this.stompClient?.connected) {
      return;
    }

    this.userId = userId;
    const socket = new SockJS('http://localhost:8080/ws');
    
    this.stompClient = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      onConnect: () => {
        this.connected = true;
        
        this.stompClient?.subscribe(
          `/user/${userId}/notificaciones`,
          (message) => {
            try {
              const notification = JSON.parse(message.body) as NotificacionSoporte;
              this.notificationsSubject.next(notification);
            } catch (e) {
              console.error('Error parsing notification:', e);
            }
          }
        );
      },
      onDisconnect: () => {
        this.connected = false;
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        this.connected = false;
      }
    });

    this.stompClient.activate();
  }

  connectAdmin(): void {
    if (this.connected && this.stompClient?.connected) {
      return;
    }

    const socket = new SockJS('http://localhost:8080/ws');
    
    this.stompClient = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      onConnect: () => {
        this.connected = true;
        
        this.stompClient?.subscribe('/topic/soporte/nuevos', (message) => {
          try {
            const ticket = JSON.parse(message.body) as TicketSoporte;
            this.nuevosTicketsSubject.next(ticket);
          } catch (e) {
            console.error('Error parsing ticket:', e);
          }
        });
      },
      onDisconnect: () => {
        this.connected = false;
      }
    });

    this.stompClient.activate();
  }

  subscribeToTicket(ticketId: number): void {
    if (!this.stompClient?.connected) return;

    this.stompClient.subscribe(`/topic/soporte/${ticketId}`, (message) => {
      try {
        const ticket = JSON.parse(message.body) as TicketSoporte;
        this.ticketUpdatesSubject.next(ticket);
      } catch (e) {
        console.error('Error parsing ticket update:', e);
      }
    });
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.stompClient?.connected;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
