import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Avatar } from '../../service/avatar'; // <-- servicio de avatar
import { ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../service/auth.service';

interface Mensaje {
  tipo: 'user' | 'bot';
  texto: SafeHtml | string;
  hora: string;
}

interface Conversacion {
  id_conversacion: number;
  titulo: string;
  created_at?: string;
}

@Component({
  selector: 'app-chat-bot',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf, NgFor, NgClass],
  templateUrl: './chat-bot.html',
  styleUrls: ['./chat-bot.css']
})
export class ChatBotComponent implements OnInit {

  // -----------------------------
  // DRAG HANDLE - Bottom Sheet
  // -----------------------------
  isDragging = false;
  startY = 0;
  startHeight = 75;
  currentChatHeight = 75;
  minHeight = 30;
  maxHeight = 90;

  private getClientY(event: TouchEvent | MouseEvent): number {
    if (event instanceof TouchEvent) {
      return event.touches[0].clientY;
    }
    return event.clientY;
  }

  startDrag(event: TouchEvent | MouseEvent) {
    event.preventDefault();
    this.isDragging = true;
    this.startY = this.getClientY(event);
    this.startHeight = this.currentChatHeight;
    document.body.style.overflow = 'hidden';
  }

  onDrag(event: TouchEvent | MouseEvent) {
    if (!this.isDragging) return;
    
    const currentY = this.getClientY(event);
    const delta = this.startY - currentY;
    const windowHeight = window.innerHeight;
    const newHeight = this.startHeight + (delta / windowHeight * 100);
    this.currentChatHeight = Math.min(Math.max(newHeight, this.minHeight), this.maxHeight);
    
    this.updateChatHeight(this.currentChatHeight);
  }

  endDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;
    document.body.style.overflow = '';
    localStorage.setItem('chatHeight', String(Math.round(this.currentChatHeight)));
  }

  updateChatHeight(height: number) {
    const container = document.querySelector('.chat-container') as HTMLElement;
    if (container) {
      container.style.setProperty('--chat-height', `${height}vh`);
    }
  }

  // -----------------------------
  // SCROLL DEL CHAT
  // -----------------------------
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  scrollToBottom() {
    setTimeout(() => {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop =
          this.chatContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  // -----------------------------
  // MEJORA: DETECTAR NUEVOS MENSAJES AUTOMÁTICAMENTE
  // -----------------------------
  private lastMessageCount = 0;

  autoScrollIfNeeded(){
    if(this.mensajes.length !== this.lastMessageCount){
      this.lastMessageCount = this.mensajes.length;
      this.scrollToBottom();
    }
  }

  // -----------------------------
  // AVATARES
  // -----------------------------
  usuarioAvatar: string = '';
  botAvatar: string = "assets/images/Gemini_Generated_Image_npokq1npokq1npok-removebg-preview.png"; // Avatar del bot

  // -----------------------------
  // FECHA Y ESTADO DEL CHAT
  // -----------------------------
  currentYear = new Date().getFullYear();
  mostrarChat = false;
  sidebarCollapsed = true;
  fechaCreacionConversacion: string | null = null;

  // -----------------------------
  // MENSAJES Y CONVERSACIONES
  // -----------------------------
  mensaje: string = '';
  mensajes: Mensaje[] = [];
  conversaciones: Conversacion[] = [];
  conversationId: string | null = localStorage.getItem('conversationId');

  // -----------------------------
  // MEJORA: CACHE LOCAL DE CONVERSACIONES
  // -----------------------------
  conversacionesCache: Conversacion[] = [];

  // -----------------------------
  // URLS API
  // -----------------------------
  readonly API_URL = "http://127.0.0.1:8000/chat";
  readonly CONVERSATIONS_URL = "http://127.0.0.1:8000/conversations";
  readonly MESSAGES_URL = "http://127.0.0.1:8000/conversations";
  userId: string | null = localStorage.getItem('userId') || null;

  constructor(private router: Router, private avatarService: Avatar, private sanitizer: DomSanitizer, private authService: AuthService) {}

  // =============================
  // ABRIR / CERRAR CHAT Y SIDEBAR
  // =============================
  toggleChat() {
    this.mostrarChat = !this.mostrarChat;
    if (this.mostrarChat) this.sidebarCollapsed = true;
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

async nuevoChat() {
  // 🔹 Limpiar frontend
  this.conversationId = null;
  localStorage.removeItem("conversationId");
  this.mensajes = [];
  this.scrollToBottom();

  try {
    // 🔹 Llamar al backend para crear nueva conversación (el backend envía el saludo inicial)
    const res = await fetch(this.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: this.userId,
        message: "",           // 🔹 mensaje vacío, no enviamos "hola"
        conversation_id: null
      })
    });

    const data = await res.json();

    if (data.id_conversacion !== null && data.id_conversacion !== undefined) {
      // 🔹 Guardar id de conversación
      this.conversationId = String(data.id_conversacion);
      localStorage.setItem("conversationId", this.conversationId);

      const now = new Date();

      // 🔹 Fecha de creación en tiempo real, hora Colombia
      this.fechaCreacionConversacion = now.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'America/Bogota'
      });

      // 🔹 Mostrar saludo inicial que envía el backend
      if (data.response) {
        this.mensajes = [{
          tipo: 'bot',
          texto: this.sanitizer.bypassSecurityTrustHtml(data.response),
          hora: now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Bogota'
          })
        }];
      }

      // 🔹 Cargar lista de conversaciones en segundo plano
      await this.cargarConversaciones();

      // 🔹 Mantener scroll al final
      this.scrollToBottom();
    }

  } catch (err) {
    console.error("Error creando nuevo chat", err);

    const now = new Date();
    this.mensajes = [{
      tipo: 'bot',
      texto: "Error al iniciar nueva conversación.",
      hora: now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true, 
        timeZone: 'America/Bogota'
      })
    }];
    this.scrollToBottom();
  }
}

  // =============================
  // CARGAR CONVERSACIONES
  // =============================
  async cargarConversaciones() {
    try {
      const res = await fetch(`${this.CONVERSATIONS_URL}?user_id=${this.userId}`);
      this.conversaciones = await res.json();

      // 🔹 guardar cache local
      this.conversacionesCache = [...this.conversaciones];

    } catch(err) {
      console.error("Error cargando conversaciones", err);
    }
  }

  // =============================
  // CARGAR MENSAJES
  // =============================
  async cargarMensajes(id: number) {
    this.conversationId = String(id);
    localStorage.setItem("conversationId", this.conversationId);

    try {

      const convRes = await fetch(`${this.CONVERSATIONS_URL}/${id}`);
      const convData = await convRes.json();

      if (convData && convData.created_at) {
        const fecha = new Date(convData.created_at);
        this.fechaCreacionConversacion = fecha.toLocaleString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else {
        this.fechaCreacionConversacion = '...';
      }

      const res = await fetch(`${this.MESSAGES_URL}/${id}/messages`);
      const data = await res.json();
      console.log("MENSAJES BACKEND:", data);

      this.mensajes = data.map((msg: any) => ({
        tipo: msg.emisor === "ia" ? "bot" : "user",
        texto: this.sanitizer.bypassSecurityTrustHtml(msg.contenido),
        hora: msg.created_at
          ? new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
          : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
      }));

      this.autoScrollIfNeeded();

    } catch(err) {
      console.error("Error cargando mensajes o fecha de conversación", err);
      this.fechaCreacionConversacion = '...';
    }
  }

  // =============================
  // AGREGAR MENSAJE LOCAL
  // =============================
  agregarMensaje(tipo: 'user'|'bot', texto: string) {
    const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    this.mensajes.push({ tipo, texto, hora });
    this.autoScrollIfNeeded();
  }

  // =============================
  // BUSCAR CHATS
  // =============================
  async buscarChats(event:any){

    const query = event.target.value.trim().toLowerCase();

    // 🔹 Búsqueda instantánea local
    if(query){
      this.conversaciones = this.conversacionesCache.filter(c =>
        c.titulo.toLowerCase().includes(query)
      );
    }

    if(!query){
      this.conversaciones = [...this.conversacionesCache];
      return;
    }

    try{

      const res = await fetch(
        `${this.CONVERSATIONS_URL}/search?user_id=${this.userId}&query=${query}`
      );

      const data = await res.json();

      this.conversaciones = data;

    }catch(err){
      console.error("Error buscando chats", err);
    }

  }

  // =============================
  // BLOQUEAR DOBLE ENVÍO
  // =============================
  isSending=false;

  // =============================
  // ENVIAR MENSAJE AL API
  // =============================
  async enviarMensaje() {

    if (!this.mensaje.trim()) return;

    if(this.isSending) return;
    this.isSending=true;

    this.agregarMensaje("user", this.mensaje);

    const texto = this.mensaje;
    this.mensaje = '';

    const thinkingMsgIndex = this.mensajes.push({
      tipo: 'bot',
      texto: 'Escribiendo...',
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
    }) - 1;

    this.scrollToBottom();

    try {

      const res = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: this.userId,
          message: texto,
          conversation_id: this.conversationId ? Number(this.conversationId) : null
        })
      });

      const data = await res.json();

      if (data.navigation && data.navigation.route) {

        const confirmar = confirm(
          `¿Quieres ir a la sección "${data.navigation.name}"?`
        );

        if (confirmar) {
          this.router.navigate([data.navigation.route]);
        }

      }

      if (data.id_conversacion !== null && data.id_conversacion !== undefined) {
        this.conversationId = String(data.id_conversacion);
        localStorage.setItem("conversationId", this.conversationId);
        await this.cargarConversaciones();
      }

      this.mensajes[thinkingMsgIndex] = {
        tipo: 'bot',
        texto: this.sanitizer.bypassSecurityTrustHtml(data.response),
        hora: new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };

      this.mensajes = [...this.mensajes];

      this.scrollToBottom();

    } catch(err) {

      console.error("Error enviando mensaje", err);

      this.mensajes[thinkingMsgIndex] = {
        tipo: 'bot',
        texto: "Error al procesar el mensaje.",
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
      };

      this.scrollToBottom();
    }

    this.isSending=false;
  }

  activeMenuId: number | null = null;

toggleMenu(event: MouseEvent, conversationId: number) {
  event.stopPropagation();
  if (this.activeMenuId === conversationId) {
    this.activeMenuId = null;
  } else {
    this.activeMenuId = conversationId;
  }
}

  onDropdownClick(event: MouseEvent) {
    event.stopPropagation();
  }

@HostListener('document:click', ['$event'])
clickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.conversation-item') && !target.closest('.menu-dropdown')) {
    this.activeMenuId = null;
  }
}

@HostListener('document:mousemove', ['$event'])
onMouseMove(event: MouseEvent) {
  this.onDrag(event);
}

@HostListener('document:mouseup')
onMouseUp() {
  this.endDrag();
}

@HostListener('document:touchmove', ['$event'])
onTouchMove(event: TouchEvent) {
  this.onDrag(event);
}

@HostListener('document:touchend')
onTouchEnd() {
  this.endDrag();
}

  // =============================
  // ELIMINAR CONVERSACIONES
  // =============================
  async eliminarConversacion(id:number, event:Event){

    event.stopPropagation();

    if(!confirm("¿Eliminar esta conversación?")) return;

    try{

      const res = await fetch(
        `${this.CONVERSATIONS_URL}/${id}?user_id=${this.userId}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      console.log(data.message);

      await this.cargarConversaciones();

      if(String(id) === this.conversationId){
        this.nuevoChat();
      }

    }catch(err){

      console.error("Error eliminando conversación", err);

    }

  }

// -----------------------------
// VARIABLES DE VOZ
// -----------------------------
isListening = false;
recognition: any;

// -----------------------------
// INICIAR DICTADO DE VOZ
// -----------------------------
async startVoiceDictation() {

  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('Tu navegador no soporta reconocimiento de voz.');
    return;
  }

  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  this.recognition = new SpeechRecognitionClass();
  this.recognition.lang = 'es-CO';
  this.recognition.interimResults = true;
  this.recognition.continuous = true;
  this.isListening = true;

  this.mensaje = '';

  this.recognition.onresult = (event: any) => {
    let currentTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      currentTranscript += event.results[i][0].transcript;
    }

    this.mensaje = currentTranscript.trim();
  };

  this.recognition.onerror = (event: any) => {
    console.error('Error de reconocimiento de voz:', event.error);
    this.stopVoiceDictation();
  };

  this.recognition.onend = () => {
    if (this.isListening) {
      this.recognition.start();
    } else {
      this.isListening = false;
    }
  };

  this.recognition.start();
}

// -----------------------------
// DETENER DICTADO
// -----------------------------
stopVoiceDictation() {
  if (this.recognition) {
    this.isListening = false;
    this.recognition.stop();
  }
}

// -----------------------------
// BOTÓN PRINCIPAL: ENVIAR O DICTADO
// -----------------------------
async onMainAction() {
  if (this.mensaje.trim()) {
    // Aumentar altura cuando usuario escribe/envía
    if (this.currentChatHeight < 85) {
      this.currentChatHeight = 85;
      this.updateChatHeight(85);
      localStorage.setItem('chatHeight', '85');
    }
    await this.enviarMensaje();
  } else {
    this.isListening ? this.stopVoiceDictation() : await this.startVoiceDictation();
  }
}

onInputFocus() {
  // Reducir un poco cuando el teclado aparece
  if (window.innerWidth <= 768 && this.currentChatHeight > 60) {
    const newHeight = Math.max(60, this.currentChatHeight - 15);
    this.currentChatHeight = newHeight;
    this.updateChatHeight(newHeight);
  }
}

  // =============================
  // IR A MODO VOZ
  // =============================
  async irAVistaDeVoz() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStorage.setItem('voiceMode', 'true');
      stream.getTracks().forEach(track => track.stop());
      this.router.navigate(['/voice-chat']);
    } catch(error) {
      alert('Debes permitir el micrófono 🎙️');
    }
  }


  showChat = false;

// =============================
// INIT
// =============================
async ngOnInit() {
  // Cargar altura guardada del chat
  const savedHeight = localStorage.getItem('chatHeight');
  if (savedHeight) {
    this.currentChatHeight = parseInt(savedHeight, 10);
    this.startHeight = this.currentChatHeight;
    setTimeout(() => this.updateChatHeight(this.currentChatHeight), 0);
  }

  // 🔹 Suscribirse al usuario autenticado
  this.authService.currentUser$.subscribe(async (user) => {
    if (user?.userId) {
      this.userId = user.userId;
      this.showChat = true;

      // 🔹 Cargar avatar solo si hay usuario
      this.avatarService.loadAvatarForUser(this.userId);

      // 🔹 Suscribirse a cambios de avatar
      this.avatarService.avatar$.subscribe((avatar) => {
        this.usuarioAvatar = avatar;
      });

      // 🔹 Cargar conversaciones solo cuando hay usuario
      await this.cargarConversaciones();

      // 🔹 Caso 1: no hay conversaciones → iniciar nuevo chat
      if (this.conversaciones.length === 0) {
        await this.nuevoChat();
        return;
      }

      // 🔹 Caso 2: hay conversación guardada → cargarla
      if (this.conversationId) {
        await this.cargarMensajes(Number(this.conversationId));
        return;
      }

      // 🔹 Caso 3: abrir la última conversación automáticamente
      const ultima = this.conversaciones[0];
      if (ultima) {
        await this.cargarMensajes(ultima.id_conversacion);
      }
    } else {
      // 🔹 Usuario no autenticado → ocultar chat y limpiar estado
      this.userId = null;
      this.showChat = false;
      this.mensajes = [];
      this.conversationId = null;
      this.fechaCreacionConversacion = null;
    }
  });
}
}