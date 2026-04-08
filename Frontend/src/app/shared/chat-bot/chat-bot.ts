import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Avatar } from '../../service/avatar'; // <-- servicio de avatar
import { ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../service/auth.service';
import Swal from 'sweetalert2';
import { VoiceChatBotComponent } from '../voice-chat-bot/voice-chat-bot';

interface Mensaje {
  tipo: 'user' | 'bot';
  texto: SafeHtml | string;
  hora: string;
}

interface Conversacion {
  id_conversacion: number;
  titulo: string;
  created_at?: string;
  titulo_manual?: boolean;
}

@Component({
  selector: 'app-chat-bot',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf, NgFor, NgClass, VoiceChatBotComponent],
  templateUrl: './chat-bot.html',
  styleUrls: ['./chat-bot.css']
})
export class ChatBotComponent implements OnInit {

  // -----------------------------
  // TEXTAREA AUTO-RESIZE - AUTO-GROWING BEHAVIOR
  // -----------------------------
  @ViewChild('mensajeTextarea') mensajeTextarea!: ElementRef<HTMLTextAreaElement>;

  private readonly MIN_HEIGHT = 44;
  private readonly MAX_HEIGHT = 150;

  // Auto-growing textarea - se ajusta automáticamente al contenido
  onTextareaInput() {
    const textarea = this.mensajeTextarea?.nativeElement as HTMLTextAreaElement;
    if (!textarea) return;
    
    // Resetear para recalcular el tamaño natural
    textarea.style.height = 'auto';
    
    // Calcular nueva altura basada en el contenido (scrollHeight)
    const newHeight = Math.min(Math.max(textarea.scrollHeight, this.MIN_HEIGHT), this.MAX_HEIGHT);
    textarea.style.height = newHeight + 'px';
    
    // Scroll interno cuando llegue al máximo
    textarea.style.overflowY = textarea.scrollHeight > this.MAX_HEIGHT ? 'auto' : 'hidden';
  }

  // Manejar Enter para enviar (Shift+Enter = nueva línea sin enviar)
  onEnterPressed(event: any) {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      event.preventDefault();
      this.enviarMensaje();
    }
  }

  // Resetear textarea después de enviar mensaje
  private resetTextarea() {
    const textarea = this.mensajeTextarea?.nativeElement as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = this.MIN_HEIGHT + 'px';
      textarea.style.overflowY = 'hidden';
    }
  }

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
  mostrarVoiceChat = false;
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
  // IMÁGENES Y EVIDENCIA
  // -----------------------------
  imagenAdjunta: string | null = null;
  imagenPreview: string | null = null;
  mostrarBotonImagen: boolean = false;
  
  // -----------------------------
  // MANEJO DE IMÁGENES
  // -----------------------------
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.procesarArchivo(file);
    }
  }
  
  onPaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            this.procesarArchivo(file);
            event.preventDefault();
            return;
          }
        }
      }
    }
  }
  
  private procesarArchivo(file: File) {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Por favor selecciona una imagen o video');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagenPreview = e.target?.result as string;
      this.imagenAdjunta = file.name;
    };
    reader.readAsDataURL(file);
  }
  
  eliminarImagen() {
    this.imagenAdjunta = null;
    this.imagenPreview = null;
    // Mostrar botón de nuevo en caso de que necesite re-subir
    this.mostrarBotonImagen = true;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

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
  readonly UPDATE_TITLE_URL = "http://127.0.0.1:8000/conversations";
  userId: string | null = localStorage.getItem('userId') || null;

  constructor(private router: Router, private avatarService: Avatar, private sanitizer: DomSanitizer, private authService: AuthService) {}

  // =============================
  // HELPERS DE VALIDACIÓN
  // =============================
  private isValidUserId(): boolean {
    if (!this.userId || this.userId === 'null' || this.userId === 'undefined') {
      return false;
    }
    const parsed = parseInt(this.userId, 10);
    return !isNaN(parsed) && parsed > 0;
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Error ${res.status}: ${res.statusText}`);
        return null;
      }
      return res.json();
    } catch (err) {
      console.error("Fetch error:", err);
      return null;
    }
  }

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
  if (!this.isValidUserId()) {
    console.warn("userId no válido para nuevo chat");
    return;
  }

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

    if (!res.ok) {
      console.error("Error creando conversación:", res.status);
      return;
    }

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
        this.processTablesInMessages();
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
    if (!this.isValidUserId()) {
      console.warn("userId no válido, saltando carga de conversaciones");
      this.conversaciones = [];
      this.conversacionesCache = [];
      return;
    }

    try {
      const data = await this.fetchJson<Conversacion[]>(`${this.CONVERSATIONS_URL}?user_id=${this.userId}`);
      
      if (data && Array.isArray(data)) {
        this.conversaciones = data;
        this.conversacionesCache = [...this.conversaciones];
      } else {
        console.warn("Respuesta inválida al cargar conversaciones");
        this.conversaciones = [];
        this.conversacionesCache = [];
      }
    } catch(err) {
      console.error("Error cargando conversaciones", err);
      this.conversaciones = [];
      this.conversacionesCache = [];
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
      if (!convRes.ok) {
        console.error("Error cargando conversación:", convRes.status);
        return;
      }
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
      if (!res.ok) {
        console.error("Error cargando mensajes:", res.status);
        return;
      }
      const data = await res.json();

      if (Array.isArray(data)) {
        this.mensajes = data.map((msg: any) => ({
          tipo: msg.emisor === "ia" ? "bot" : "user",
          texto: this.sanitizer.bypassSecurityTrustHtml(msg.contenido),
          hora: msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
            : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
        }));
      } else {
        this.mensajes = [];
      }

      this.autoScrollIfNeeded();
      this.processTablesInMessages();

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

    if (!this.isValidUserId()) {
      console.warn("userId no válido para búsqueda");
      return;
    }

    try{
      const data = await this.fetchJson<Conversacion[]>(
        `${this.CONVERSATIONS_URL}/search?user_id=${this.userId}&query=${query}`
      );

      if (data && Array.isArray(data)) {
        this.conversaciones = data;
      }
    }catch(err){
      console.error("Error buscando chats", err);
    }

  }

  // =============================
  // PROCESAR TABLAS PARA RESPONSIVE
  // =============================
  processTablesInMessages() {
    setTimeout(() => {
      const msgTexts = document.querySelectorAll('.msg-text');
      msgTexts.forEach((msgEl) => {
        const tables = msgEl.querySelectorAll('table');
        tables.forEach((table) => {
          if (table.dataset['processed']) return;
          table.dataset['processed'] = 'true';
          
          const headers = table.querySelectorAll('thead th');
          const headerTexts: string[] = [];
          headers.forEach((th) => headerTexts.push(th.textContent?.trim() || ''));
          
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
              if (headerTexts[index]) {
                cell.setAttribute('data-label', headerTexts[index]);
              }
            });
          });
        });
      });
    }, 100);
  }
  isSending=false;

  // =============================
  // ENVIAR MENSAJE AL API
  // =============================
  async enviarMensaje() {

    if (!this.mensaje.trim()) return;

    if(this.isSending) return;
    this.isSending=true;

    this.agregarMensaje("user", this.mensaje);

    // Limpiar imagen si el usuario envía texto (la imagen no se envío)
    const imagenEnviada = this.imagenAdjunta;
    this.imagenAdjunta = null;
    this.imagenPreview = null;
    this.mostrarBotonImagen = false;

    const texto = this.mensaje;
    this.mensaje = '';
    
    // Resetear textarea después de enviar
    this.resetTextarea();

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

      this.processTablesInMessages();

      // DETECTAR SI EL BOT PIDE EVIDENCIA
      const respuestaBot = data.response?.toString().toLowerCase() || '';
      if (respuestaBot.includes('evidencia') || respuestaBot.includes('foto del incidente') || respuestaBot.includes('imagen')) {
        this.mostrarBotonImagen = true;
      }
      
      // Ocultar botón si ya hay imagen adjunta
      if (this.imagenAdjunta) {
        this.mostrarBotonImagen = false;
      }

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

async cambiarNombre(conv: Conversacion, event: Event) {
  event.stopPropagation();
  event.preventDefault();
  this.activeMenuId = null;

  if (!this.isValidUserId()) {
    Swal.fire('Error', 'Usuario no válido', 'error');
    return;
  }

  const { value: newName } = await Swal.fire({
    title: 'Cambiar nombre',
    input: 'text',
    inputLabel: 'Nuevo nombre',
    inputValue: conv.titulo || '',
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    customClass: {
      container: 'chatbot-swal-container'
    },
    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return 'Debes ingresar un nombre';
      }
      return null;
    }
  });

  if (!newName || !newName.trim()) return;

  try {
    const res = await fetch(`${this.CONVERSATIONS_URL}/${conv.id_conversacion}/title?user_id=${this.userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: newName.trim(),
        manual: true
      })
    });

    if (!res.ok) {
      throw new Error('Error al actualizar');
    }

    await this.cargarConversaciones();

    Swal.fire({
      icon: 'success',
      title: 'Nombre actualizado',
      timer: 1500,
      showConfirmButton: false
    });

  } catch(err) {
    console.error("Error cambiando nombre", err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo cambiar el nombre'
    });
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

    const result = await Swal.fire({
      title: '¿Eliminar esta conversación?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: {
        container: 'chatbot-swal-container'
      }
    });

    if (!result.isConfirmed) return;

    if (!this.isValidUserId()) {
      Swal.fire('Error', 'Usuario no válido', 'error');
      return;
    }

    try{
      const res = await fetch(
        `${this.CONVERSATIONS_URL}/${id}?user_id=${this.userId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        console.error("Error eliminando conversación:", res.status);
        Swal.fire('Error', 'No se pudo eliminar la conversación', 'error');
        return;
      }

      await this.cargarConversaciones();

      Swal.fire({
        icon: 'success',
        title: 'Conversación eliminada',
        timer: 1500,
        showConfirmButton: false
      });

      if(String(id) === this.conversationId){
        this.nuevoChat();
      }

    }catch(err){

      console.error("Error eliminando conversación", err);
      Swal.fire('Error', 'No se pudo eliminar la conversación', 'error');

    }

  }

// -----------------------------
// VARIABLES DE VOZ
// -----------------------------
isListening = false;
recognition: any;
lastTranscript = '';

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
  this.recognition.interimResults = false;
  this.recognition.continuous = false;
  this.isListening = true;
  this.lastTranscript = '';

  this.recognition.onresult = (event: any) => {
    const result = event.results[event.results.length - 1];
    if (result.isFinal) {
      const transcript = result[0].transcript.trim();
      if (transcript && transcript !== this.lastTranscript) {
        this.lastTranscript = transcript;
        this.mensaje = (this.mensaje + ' ' + transcript).trim();
      }
    }
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
    this.lastTranscript = '';
    this.recognition.stop();
  }
}

// -----------------------------
// BOTÓN PRINCIPAL: SOLO DICTADO
// -----------------------------
onMainAction() {
  this.isListening ? this.stopVoiceDictation() : this.startVoiceDictation();
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

  // =============================
  // IR A VOICE CHAT BOT
  // =============================
  irAVoiceChat() {
    this.mostrarChat = false;
    this.mostrarVoiceChat = true;
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