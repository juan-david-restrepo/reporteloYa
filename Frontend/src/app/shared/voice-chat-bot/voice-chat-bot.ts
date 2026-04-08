import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface AudioEnergyEntry {
  energy: number;
  time: number;
}

@Component({
  selector: 'app-voice-chat-bot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-chat-bot.html',
  styleUrls: ['./voice-chat-bot.css']
})
export class VoiceChatBotComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('toastEl') toastRef!: ElementRef<HTMLDivElement>;
  @ViewChild('statusTextEl') statusTextRef!: ElementRef<HTMLDivElement>;
  @ViewChild('speakPromptEl') speakPromptRef!: ElementRef<HTMLDivElement>;
  @ViewChild('introOverlayEl') introOverlayRef!: ElementRef<HTMLDivElement>;
  @ViewChild('headerTitleEl') headerTitleRef!: ElementRef<HTMLDivElement>;
  @ViewChild('muteBtnEl') muteBtnRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('callBtnEl') callBtnRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('endBtnEl') endBtnRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('startBtnEl') startBtnRef!: ElementRef<HTMLButtonElement>;

  @Output() close = new EventEmitter<void>();

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particleSystem!: THREE.Points;
  private particleCount = 1600;
  private velocities!: Float32Array;

  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private rotSpeedX = 0;
  private rotSpeedY = 0;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private micStream: MediaStream | null = null;
  private micGain: GainNode | null = null;

  private smoothedMicLevel = 0;
  private aiAudioLevel = 0;

  private isInCall = false;
  private isMuted = false;
  private isSpeaking = false;
  private isProcessing = false;

  private audio: HTMLAudioElement | null = null;
  private ws: WebSocket | null = null;
  private recognition: SpeechRecognition | null = null;

  private cancelled = false;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private speakPromptTimer: ReturnType<typeof setTimeout> | null = null;
  private speakPromptIndex = 0;
  private isSpeakingState = false;

  private lastAiSpeakTime = 0;
  private srPaused = false;
  private srPauseTimer: ReturnType<typeof setTimeout> | null = null;
  private recentTranscripts: string[] = [];
  private processingDelayTimer: ReturnType<typeof setTimeout> | null = null;
  private audioEnergyHistory: AudioEnergyEntry[] = [];
  private lastTranscriptTime = 0;
  private continuousSpeechDetected = false;
  private speechStartTime = 0;

  private readonly MIN_SPEECH_INTERVAL = 1500;
  private readonly MIN_TRANSCRIPT_LENGTH = 2;
  private readonly MAX_RECENT_TRANSCRIPTS = 5;
  private readonly PROCESS_DELAY_AFTER_AI = 800;
  private readonly MIN_ENERGY_THRESHOLD = 0.15;
  private readonly VOICE_ENERGY_THRESHOLD = 0.25;
  private readonly SPEECH_CONFIRMATION_MS = 300;
  private readonly MAX_TRANSCRIPT_GAP_MS = 1500;

  private readonly CLIENT_ID = 'client_' + Math.random().toString(36).substr(2, 9);

  private readonly SPEAK_PROMPTS = ['Di tu pregunta...', 'Di algo...'];

  private readonly INACTIVITY_PHRASES = [
    '¿Sigues ahí?', '¿Te puedo ayudar en algo más?',
    '¿Necesitas otra consulta?', '¿Quieres saber algo más?'
  ];

  private animationId: number | null = null;

  constructor(
    private ngZone: NgZone,
    private router: Router,
    private location: Location
  ) {}

  ngAfterViewInit(): void {
    this.init();
    this.ngZone.runOutsideAngular(() => {
      this.animate();
    });
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.cleanup();
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private isMobile(): boolean {
    return window.innerWidth <= 599;
  }

  private getHostWidth(): number {
    return this.isMobile() ? window.innerWidth : window.innerWidth * 0.75;
  }

  private init(): void {
    const canvas = this.canvasRef.nativeElement;
    
    const hostWidth = this.getHostWidth();
    const hostHeight = window.innerHeight;
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, hostWidth / hostHeight, 0.1, 1000);
    this.camera.position.z = 50;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    this.renderer.setSize(hostWidth, hostHeight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const particles = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const radius = 3 + Math.random() * 5;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos((Math.random() * 2) - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      particles[i * 3] = x;
      particles[i * 3 + 1] = y;
      particles[i * 3 + 2] = z;

      const baseGray = Math.random() * 0.4 + 0.1;
      const cyanChance = Math.random();
      if (cyanChance < 0.05) {
        colors[i * 3] = 0.2 * Math.random();
        colors[i * 3 + 1] = 0.8 * Math.random() + 0.2;
        colors[i * 3 + 2] = 1;
      } else {
        colors[i * 3] = baseGray;
        colors[i * 3 + 1] = baseGray;
        colors[i * 3 + 2] = baseGray;
      }

      this.velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const sprite = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png');
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      map: sprite
    });

    this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.particleSystem.scale.set(0.35, 0.35, 0.35);
    this.scene.add(this.particleSystem);

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    const hostWidth = this.getHostWidth();
    this.camera.aspect = hostWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(hostWidth, window.innerHeight);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    let micLevel = 0.3;
    if (this.analyser && !this.isMuted && !this.isSpeaking) {
      const timeData = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(timeData);

      let total = 0;
      for (let i = 0; i < timeData.length; i++) {
        let val = (timeData[i] - 128) / 128;
        total += Math.abs(val);
      }

      const intensity = total / timeData.length;
      const boost = Math.pow(intensity * 5, 1.5);
      micLevel = Math.min(boost, 2.5);
    }

    if (this.isSpeaking) {
      const time = Date.now() / 100;
      const base = 0.8;
      const s1 = Math.sin(time) * 0.25;
      const s2 = Math.sin(time * 1.7) * 0.15;
      const s3 = Math.sin(time * 3.1) * 0.08;
      const noise = (Math.random() - 0.5) * 0.04;
      const target = base + s1 + s2 + s3 + noise;
      this.aiAudioLevel += (target - this.aiAudioLevel) * 0.15;
    } else {
      this.aiAudioLevel *= 0.9;
    }

    const smoothingFactor = 0.12;
    this.smoothedMicLevel += (micLevel - this.smoothedMicLevel) * smoothingFactor;

    const pos = this.particleSystem.geometry.attributes['position'].array;
    for (let i = 0; i < this.particleCount; i++) {
      pos[i * 3] += this.velocities[i * 3];
      pos[i * 3 + 1] += this.velocities[i * 3 + 1];
      pos[i * 3 + 2] += this.velocities[i * 3 + 2];

      if (Math.random() < 0.002) {
        this.velocities[i * 3] = (Math.random() - 0.5) * 0.2;
        this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
        this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      }

      let reactionStrength;
      if (this.isSpeaking) {
        reactionStrength = this.aiAudioLevel * 1.5;
      } else {
        reactionStrength = micLevel * 1.4;
      }
      const expansion = 1 + reactionStrength * 0.7;

      pos[i * 3] *= expansion;
      pos[i * 3 + 1] *= expansion;
      pos[i * 3 + 2] *= expansion;

      this.velocities[i * 3] *= 0.98;
      this.velocities[i * 3 + 1] *= 0.98;
      this.velocities[i * 3 + 2] *= 0.98;

      const radius = Math.sqrt(pos[i * 3] ** 2 + pos[i * 3 + 1] ** 2 + pos[i * 3 + 2] ** 2);
      const maxRadius = 16;
      if (radius > maxRadius) {
        pos[i * 3] *= maxRadius / radius;
        pos[i * 3 + 1] *= maxRadius / radius;
        pos[i * 3 + 2] *= maxRadius / radius;
      }
    }
    this.particleSystem.geometry.attributes['position'].needsUpdate = true;

    this.particleSystem.rotation.y += 0.0015;
    this.particleSystem.rotation.x += 0.0007;

    this.particleSystem.rotation.y += this.rotSpeedY;
    this.particleSystem.rotation.x += this.rotSpeedX;

    this.rotSpeedX *= 0.95;
    this.rotSpeedY *= 0.95;

    const effectiveLevel = this.isSpeaking ? this.aiAudioLevel : this.smoothedMicLevel;
    const targetScale = 1 + effectiveLevel * 0.5;
    const smoothFactor = 0.12;
    this.particleSystem.scale.x += (targetScale - this.particleSystem.scale.x) * smoothFactor;
    this.particleSystem.scale.y += (targetScale - this.particleSystem.scale.y) * smoothFactor;
    this.particleSystem.scale.z += (targetScale - this.particleSystem.scale.z) * smoothFactor;

    this.renderer.render(this.scene, this.camera);
  };

  private setupEventListeners(): void {
    document.addEventListener('mousedown', (e: MouseEvent) => {
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    document.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isMouseDown) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.rotSpeedY = dx * 0.002;
      this.rotSpeedX = dy * 0.002;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });
  }

  private async setupMic(): Promise<boolean> {
    try {
      if (this.micStream) {
        this.micStream.getTracks().forEach(track => track.stop());
      }
      if (this.audioContext) {
        this.audioContext.close();
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.micStream);

      this.micGain = this.audioContext.createGain();
      this.micGain.gain.value = 1;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      source.connect(this.micGain);
      this.micGain.connect(this.analyser);

      return true;
    } catch (err) {
      console.error('Mic error:', err);
      this.showToast('Error accessing microphone', 'error');
      return false;
    }
  }

  private showToast(message: string, type: string = 'info'): void {
    const toast = this.toastRef.nativeElement;
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  private updateStatus(text: string, state: string = ''): void {
    const statusText = this.statusTextRef.nativeElement;
    statusText.textContent = text;
    statusText.className = 'status-text ' + state;
    statusText.classList.toggle('visible', state !== '');
  }

  private hidePrompt(): void {
    const prompt = this.speakPromptRef.nativeElement;
    prompt.classList.remove('visible');
  }

  private showPrompt(): void {
    const prompt = this.speakPromptRef.nativeElement;
    prompt.textContent = this.SPEAK_PROMPTS[this.speakPromptIndex % 2];
    prompt.classList.add('visible');
    this.speakPromptIndex++;
  }

  private startInactivityTimer(): void {
    this.clearTimers();
    this.hidePrompt();

    if (this.isInCall && !this.isSpeaking) {
      this.speakPromptTimer = setTimeout(() => {
        if (!this.isSpeaking && !this.isProcessing) {
          this.showPrompt();
        }
      }, 6000);

      this.inactivityTimer = setTimeout(() => {
        this.hidePrompt();
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const phrase = this.INACTIVITY_PHRASES[Math.floor(Math.random() * this.INACTIVITY_PHRASES.length)];
          this.ws.send(JSON.stringify({ type: 'user_speech', text: '__INACTIVITY__:' + phrase }));
        }
      }, 16000);
    }
  }

  private clearTimers(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.speakPromptTimer) clearTimeout(this.speakPromptTimer);
    this.inactivityTimer = null;
    this.speakPromptTimer = null;
  }

  private isCallActive = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private reconnectAttempts = 0;

  private connectWebSocket(): void {
    const wsUrl = `ws://127.0.0.1:8000/ws/${this.CLIENT_ID}`;
    console.log('[WS] Connecting to:', wsUrl);

    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(wsUrl);
    this.isCallActive = true;
    let connectionTimeout: any = null;

    connectionTimeout = setTimeout(() => {
      if (this.ws && this.ws.readyState !== WebSocket.OPEN && this.isCallActive) {
        console.log('[WS] Connection timeout, closing...');
        this.ws.close();
        this.showToast('Tiempo de conexión agotado (10s). El servidor no está disponible.', 'error');
        this.updateStatus('Error de conexión', 'error');
      }
    }, 10000);

    this.ws.onopen = () => {
      console.log('[WS] Connected successfully');
      clearTimeout(connectionTimeout);
      this.reconnectAttempts = 0;
      this.isInCall = true;
      this.callBtnRef.nativeElement.classList.add('hidden');
      this.endBtnRef.nativeElement.classList.remove('hidden');
      this.muteBtnRef.nativeElement.classList.remove('hidden');
      this.speakPromptRef.nativeElement.classList.remove('visible');
      this.updateStatus('Conectado...');

      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'user_speech', text: '__GREETING__' }));
        }
      }, 500);
    };

    this.ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      this.handleMessage(msg);
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Closed:', event.code, event.reason);
      if (!this.isCallActive) return;
      this.cleanupConnection();
      if (event.code !== 1000 && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.attemptReconnect();
      } else {
        this.isCallActive = false;
        this.cleanup();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
      this.showToast('Error de conexión con el servidor. Intenta de nuevo.', 'error');
      this.updateStatus('Error de conexión', 'error');
    };
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(`[WS] Reconnection attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
    this.showToast(`Reconectando... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`, 'info');
    this.updateStatus('Reconectando...', '');

    this.reconnectTimer = setTimeout(() => {
      if (this.isCallActive) {
        this.connectWebSocket();
      }
    }, 3000);
  }

  private cleanupConnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private handleMessage(msg: any): void {
    switch (msg.type) {
      case 'status':
        if (msg.status === 'listening') {
          this.updateStatus('Escuchando...', 'listening');
          this.isSpeaking = false;
          this.isProcessing = false;
          this.clearTimers();
          this.clearProcessingDelay();
          this.hidePrompt();
        } else if (msg.status === 'processing') {
          this.updateStatus('Procesando...', 'processing');
          this.isProcessing = true;
          this.clearTimers();
          this.hidePrompt();
        } else if (msg.status === 'interrupted') {
          if (this.audio) {
            this.audio.pause();
            this.audio = null;
          }
          this.isSpeaking = false;
          this.isProcessing = false;
          this.clearTimers();
          this.clearProcessingDelay();
          this.hidePrompt();
        }
        break;
      case 'audio':
        this.playAudio(msg.audio);
        break;
      case 'error':
        this.showToast(msg.message, 'error');
        this.isSpeaking = false;
        this.isProcessing = false;
        this.hidePrompt();
        break;
    }
  }

  private playAudio(base64: string): void {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }

    this.clearProcessingDelay();
    this.clearTimers();
    this.hidePrompt();
    this.lastAiSpeakTime = Date.now();

    const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'audio/mp3' });
    this.audio = new Audio(URL.createObjectURL(blob));
    this.isSpeaking = true;
    this.isProcessing = false;
    this.aiAudioLevel = 0.8;
    this.updateStatus('Hablando...', 'speaking');

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) { }
    }

    this.audio.onended = () => {
      this.isSpeaking = false;
      this.aiAudioLevel = 0;
      this.hidePrompt();
      if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isMuted) {
        this.startInactivityTimer();
        this.startListeningWithDelay();
      }
    };

    this.audio.onerror = () => {
      this.isSpeaking = false;
      this.isProcessing = false;
      this.aiAudioLevel = 0;
    };

    this.audio.play().catch(e => {
      console.error('Audio error:', e);
      this.showToast('Error al reproducir', 'error');
      this.isSpeaking = false;
      this.aiAudioLevel = 0;
    });
  }

  private getCurrentAudioEnergy(): number {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return sum / (this.dataArray.length * 255);
  }

  private updateAudioEnergyHistory(): void {
    const energy = this.getCurrentAudioEnergy();
    this.audioEnergyHistory.push({ energy, time: Date.now() });
    const cutoff = Date.now() - 2000;
    this.audioEnergyHistory = this.audioEnergyHistory.filter(e => e.time > cutoff);
  }

  private hasSustainedHighEnergy(duration: number = 200): boolean {
    if (this.audioEnergyHistory.length < 3) return false;
    const now = Date.now();
    const recent = this.audioEnergyHistory.filter(e => now - e.time <= duration);
    if (recent.length < 2) return false;

    const avgEnergy = recent.reduce((sum, e) => sum + e.energy, 0) / recent.length;
    const highEnergyCount = recent.filter(e => e.energy >= this.VOICE_ENERGY_THRESHOLD).length;

    return avgEnergy >= this.VOICE_ENERGY_THRESHOLD && highEnergyCount >= recent.length * 0.5;
  }

  private isLikelyEcho(energy: number): boolean {
    if (this.isSpeaking) {
      const recentEnergy = this.audioEnergyHistory.slice(-5);
      if (recentEnergy.length > 0) {
        const avgRecent = recentEnergy.reduce((s, e) => s + e.energy, 0) / recentEnergy.length;
        if (energy < avgRecent * 0.7 && energy < this.VOICE_ENERGY_THRESHOLD) {
          return true;
        }
      }
      return energy < this.MIN_ENERGY_THRESHOLD;
    }
    return false;
  }

  private hasContinuousSpeechPattern(transcript: string, transcriptTime: number): boolean {
    const gap = transcriptTime - this.lastTranscriptTime;
    const isContinuous = gap < this.MAX_TRANSCRIPT_GAP_MS && this.continuousSpeechDetected;
    const isNewSpeech = transcript.length > 5;

    if (isNewSpeech) {
      if (!this.continuousSpeechDetected) {
        this.speechStartTime = transcriptTime;
        this.continuousSpeechDetected = true;
      }
      const speechDuration = transcriptTime - this.speechStartTime;
      return speechDuration >= this.SPEECH_CONFIRMATION_MS || transcript.length > 10;
    }

    return isContinuous;
  }

  private shouldProcessTranscript(transcript: string): boolean {
    const now = Date.now();
    const transcriptTime = now;

    this.updateAudioEnergyHistory();
    const currentEnergy = this.getCurrentAudioEnergy();

    if (this.srPaused) {

      return false;
    }

    if (this.processingDelayTimer !== null && !this.isSpeaking) {

      return false;
    }

    if (this.isSpeaking) {
      if (transcript.length < 4) {

        return false;
      }

      const cleanTranscript = transcript.toLowerCase().trim();
      for (const recent of this.recentTranscripts) {
        if (recent === cleanTranscript) {

          return false;
        }
      }

      this.lastTranscriptTime = transcriptTime;
      this.continuousSpeechDetected = true;
      return true;
    }

    if (this.isLikelyEcho(currentEnergy) && currentEnergy < this.VOICE_ENERGY_THRESHOLD) {

      return false;
    }

    const timeSinceAiSpeak = now - this.lastAiSpeakTime;
    if (timeSinceAiSpeak < this.MIN_SPEECH_INTERVAL) {

      return false;
    }

    if (transcript.length < this.MIN_TRANSCRIPT_LENGTH) {

      return false;
    }

    if (!this.hasContinuousSpeechPattern(transcript, transcriptTime)) {

      return false;
    }

    const cleanTranscript = transcript.toLowerCase().trim();
    for (const recent of this.recentTranscripts) {
      if (recent === cleanTranscript) {

      }
      if (recent.includes(cleanTranscript) || cleanTranscript.includes(recent)) {
        if (recent.length > 3 && cleanTranscript.length > 3) {

          return false;
        }
      }
    }

    this.lastTranscriptTime = transcriptTime;
    this.continuousSpeechDetected = true;
    return true;
  }

  private processValidTranscript(transcript: string): void {
    this.recentTranscripts.push(transcript.toLowerCase().trim());
    if (this.recentTranscripts.length > this.MAX_RECENT_TRANSCRIPTS) {
      this.recentTranscripts.shift();
    }
    this.continuousSpeechDetected = false;

    this.clearTimers();
    this.hidePrompt();

    if (this.isSpeaking && this.audio) {
      this.ws?.send(JSON.stringify({ type: 'interrupt' }));
      this.audio.pause();
      this.audio = null;
      this.cancelled = true;
    }
    this.isSpeaking = false;
    this.ws?.send(JSON.stringify({ type: 'user_speech', text: transcript }));
  }

  private startRecognition(): SpeechRecognition | null {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'es-CO';

    recognition.onresult = ({ results }: any) => {
      const transcript = Array.from(results).map((r: any) => r[0].transcript.trim()).join('');
      if (transcript && !this.isMuted && this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (this.shouldProcessTranscript(transcript)) {
          this.processValidTranscript(transcript);
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('SR:', e.error);
      }
    };
    
    recognition.onend = () => {
      if (this.isInCall && !this.isMuted && !this.isSpeaking && this.recognition) {
        try {
          this.recognition.start();
        } catch (e) { }
      }
    };

    this.recognition = recognition;
    return recognition;
  }

  private startListening(): void {
    this.startInactivityTimer();
    if (!this.recognition) this.recognition = this.startRecognition();
    if (this.recognition && !this.isMuted && !this.isSpeaking) {
      try {
        this.recognition.start();
      } catch (e) { }
    }
  }

  private startListeningWithDelay(): void {
    this.clearProcessingDelay();
    this.processingDelayTimer = setTimeout(() => {
      this.processingDelayTimer = null;
      if (this.isInCall && !this.isMuted && !this.isSpeaking && this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (!this.recognition) this.recognition = this.startRecognition();
        const rec = this.recognition;
        if (rec) {
          try {
            rec.start();
          } catch (e) { }
        }
      }
    }, this.PROCESS_DELAY_AFTER_AI);
    this.startInactivityTimer();
  }

  private clearProcessingDelay(): void {
    if (this.processingDelayTimer !== null) {
      clearTimeout(this.processingDelayTimer);
      this.processingDelayTimer = null;
    }
  }

  private cleanup(): void {
    this.isInCall = false;
    this.isSpeaking = false;
    this.isProcessing = false;
    this.aiAudioLevel = 0;
    this.isCallActive = false;
    this.reconnectAttempts = 0;
    this.clearTimers();
    this.clearProcessingDelay();
    this.cleanupConnection();
    this.recentTranscripts = [];
    this.srPaused = false;
    if (this.srPauseTimer) {
      clearTimeout(this.srPauseTimer);
      this.srPauseTimer = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) { }
    }
    this.recognition = null;
    if (this.micGain) this.micGain.gain.value = 1;
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.ws) {
      this.ws = null;
    }
    if (this.callBtnRef) this.callBtnRef.nativeElement.classList.remove('hidden');
    if (this.endBtnRef) this.endBtnRef.nativeElement.classList.add('hidden');
    if (this.muteBtnRef) this.muteBtnRef.nativeElement.classList.add('hidden');
    if (this.speakPromptRef) this.speakPromptRef.nativeElement.classList.remove('visible');
    this.updateStatus('Llamada finalizada', '');
  }

  private toggleMute(): void {
    this.isMuted = !this.isMuted;
    const btn = this.muteBtnRef.nativeElement;
    btn.classList.toggle('muted', this.isMuted);
    btn.innerHTML = this.isMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';

    if (this.micGain) this.micGain.gain.value = this.isMuted ? 0 : 1;

    if (this.isMuted) {
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) { }
      }
      this.updateStatus('Silenciado');
      this.showToast('Micrófono silenciado', 'info');
    } else {
      this.startListening();
      this.updateStatus('Escuchando...', 'listening');
      this.showToast('Micrófono activado', 'success');
    }
  }

  private endCall(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
  }

  private startCall(): void {
    this.setupMic().then(ok => {
      if (ok) this.connectWebSocket();
    });
  }

  onStartBtnClick(): void {
    this.introOverlayRef.nativeElement.classList.add('hidden');
    this.headerTitleRef.nativeElement.classList.add('visible');
    this.updateStatus('Iniciando...', '');
    this.startCall();
  }

  onIntroCloseClick(): void {
    this.close.emit();
  }

  onCallBtnClick(): void {
    this.startCall();
  }

  onEndBtnClick(): void {
    this.endCall();
  }

  onMuteBtnClick(): void {
    this.toggleMute();
  }

  onCloseClick(): void {
    if (this.isInCall) {
      this.endCall();
      this.introOverlayRef.nativeElement.classList.remove('hidden');
      this.headerTitleRef.nativeElement.classList.remove('visible');
    } else {
      this.close.emit();
    }
  }
}