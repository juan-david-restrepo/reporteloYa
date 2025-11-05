import { Component } from '@angular/core';
import { ChatService } from '../../service/chat-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Mensaje {
  texto: string;
  tipo: 'user' | 'bot';
}


@Component({
  selector: 'app-chat-bot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-bot.html',
  styleUrls: ['./chat-bot.css'],
})


export class ChatBotComponent {

    mostrarChat = false;
  mensajes: Mensaje[] = [];
  textoUsuario = '';
  cargando = false;

  private saludos = ['hola', 'buenas', 'buenos días', 'buenas tardes'];

  constructor(private chatbotService: ChatService) {}

  toggleChat(): void {
    this.mostrarChat = !this.mostrarChat;
  }

  enviarMensaje(): void {
    const texto = this.textoUsuario.trim();
    if (!texto) return;

    this.agregarMensaje(texto, 'user');
    this.textoUsuario = '';
    this.cargando = true;

    // detectar saludo
    const saludo = texto.toLowerCase();
    if (this.saludos.some(s => saludo.includes(s))) {
      this.cargando = false;
      this.agregarMensaje(`👋 ¡Hola, soy Robotransit! Me han entrenado para resolver consultas relacionadas con multas y fotodetecciones.

¿Cómo te puedo ayudar hoy?`, 'bot');
      return;
    }

    // consultar API
    this.chatbotService.consultarChatbot(texto).subscribe({
      next: respuesta => {
        this.cargando = false;
        this.agregarMensaje(respuesta, 'bot');
      },
      error: () => {
        this.cargando = false;
        this.agregarMensaje('Error al conectar con la IA.', 'bot');
      }
    });
  }

  private agregarMensaje(texto: string, tipo: 'user' | 'bot'): void {
    this.mensajes.push({ texto, tipo });
    setTimeout(() => {
      const cont = document.getElementById('chatMessages');
      if (cont) cont.scrollTop = cont.scrollHeight;
    });
  }
}
