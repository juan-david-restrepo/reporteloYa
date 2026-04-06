import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import * as THREE from 'three';

interface ParticleData {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  phase: number;
  scale: number;
}

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash-screen.component.html',
  styleUrl: './splash-screen.component.css',
})
export class SplashScreenComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('threeCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('logoContainer') logoRef!: ElementRef<HTMLDivElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particlesData: ParticleData[] = [];
  private instancedMesh!: THREE.InstancedMesh;
  private animationId!: number;

  private readonly PARTICLE_COUNT = 150;
  private readonly dummy = new THREE.Object3D();

  private time = 0;
  private lastFrameTime = 0;
  private readonly TARGET_FPS = 60;
  private readonly FRAME_INTERVAL = 1000 / this.TARGET_FPS;

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initThreeJS();
    this.createParticles();
    this.startAnimation();
    this.startGsapTimeline();
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    window.removeEventListener('resize', () => this.onResize());
  }

  private initThreeJS(): void {
    const canvas = this.canvasRef.nativeElement;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.002);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000,
    );
    this.camera.position.z = 500;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x0a0e1a, 0);

    window.addEventListener('resize', () => this.onResize());
  }

  private createParticles(): void {
    const geometry = new THREE.SphereGeometry(1.2, 4, 4);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4da6ff,
      transparent: true,
      opacity: 0.7,
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.PARTICLE_COUNT);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 1200;
      const y = (Math.random() - 0.5) * 800;
      const z = (Math.random() - 0.5) * 400;

      this.particlesData.push({
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        vz: (Math.random() - 0.5) * 0.08,
        phase: Math.random() * Math.PI * 2,
        scale: 0.6 + Math.random() * 0.4,
      });

      this.dummy.position.set(x, y, z);
      this.dummy.scale.setScalar(0.8);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.PARTICLE_COUNT * 3),
      3,
    );

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const hue = 0.55 + Math.random() * 0.05;
      const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
      this.instancedMesh.instanceColor!.setXYZ(i, color.r, color.g, color.b);
    }

    this.scene.add(this.instancedMesh);
  }

  private startAnimation(): void {
    this.ngZone.runOutsideAngular(() => {
      const animate = (timestamp: number) => {
        this.animationId = requestAnimationFrame(animate);

        const delta = timestamp - this.lastFrameTime;
        if (delta < this.FRAME_INTERVAL) return;

        this.lastFrameTime = timestamp - (delta % this.FRAME_INTERVAL);
        this.time += delta * 0.001;

        this.updateParticles();
        this.updateCamera();
        this.renderer.render(this.scene, this.camera);
      };
      animate(0);
    });
  }

  private updateParticles(): void {
    const t = this.time;

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const p = this.particlesData[i];

      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      p.x = ((p.x + 600) % 1200) - 600;
      p.y = ((p.y + 400) % 800) - 400;
      p.z = ((p.z + 200) % 400) - 200;

      const scale = p.scale * (0.7 + Math.sin(t * 1.5 + p.phase) * 0.3);

      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  private updateCamera(): void {
    this.camera.position.x = Math.sin(this.time * 0.08) * 15;
    this.camera.position.y = Math.cos(this.time * 0.06) * 12;
    this.camera.lookAt(0, 0, 0);
  }

  private startGsapTimeline(): void {
    const tl = gsap.timeline({
      onComplete: () => this.onAnimationComplete(),
    });

    gsap.set('.splash-container', { opacity: 1 });
    gsap.set('.bg-gradient', { opacity: 0, scale: 1.1 });
    gsap.set('.particle-canvas', { opacity: 0 });
    gsap.set('.logo-fragment', {
      opacity: 0,
      scale: 0,
      x: () => Math.random() * 100 - 50,
      y: () => Math.random() * 100 - 50,
    });
    gsap.set('.logo-core', {
      opacity: 0,
      scale: 0,
      filter: 'blur(20px)',
    });
    gsap.set('.logo-glow-ring', { opacity: 0, scale: 0 });
    gsap.set('.energy-ring', { opacity: 0, scale: 0 });
    gsap.set('.orbit-ring', { opacity: 0, scale: 0 });
    gsap.set('.title-char', {
      opacity: 0,
      y: 40,
      filter: 'blur(8px)',
    });
    gsap.set('.tagline', { opacity: 0, y: 20, filter: 'blur(5px)' });
    gsap.set('.subtitle', { opacity: 0, y: 15 });
    gsap.set('.scan-line', { scaleX: 0, opacity: 0 });
    gsap.set('.corner-frame', { opacity: 0, scale: 0.5 });

    tl.to('.bg-gradient', { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, 0);

    tl.to('.particle-canvas', { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.2);

    tl.to('.scan-line', { scaleX: 1, opacity: 0.5, duration: 0.5, ease: 'power2.out' }, 0.4);

    tl.to(
      '.corner-frame',
      { opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.5)' },
      0.6,
    );

    tl.to('.logo-glow-ring', { opacity: 1, scale: 1, duration: 1.5, ease: 'power2.out' }, 0.5);

    tl.to(
      '.logo-fragment',
      {
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
        duration: 0.6,
        stagger: { each: 0.05, from: 'random' },
        ease: 'back.out(1.2)',
      },
      0.6,
    );

    tl.to('.energy-ring', { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, 0.9);

    tl.to(
      '.orbit-ring',
      { opacity: 0.5, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.5)' },
      0.9,
    );

    tl.to(
      '.logo-core',
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out' },
      1,
    );

    tl.to(
      '.title-char',
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.4,
        stagger: { each: 0.05, from: 'start' },
        ease: 'power2.out',
      },
      1.4,
    );

    tl.to('.tagline', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4, ease: 'power2.out' }, 1.8);

    tl.to('.subtitle', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 2);

    tl.to('.splash-container', { scale: 1.01, duration: 0.5, ease: 'power2.inOut' }, 3.5);

    tl.to(
      '.splash-container',
      {
        opacity: 0,
        scale: 1.1,
        filter: 'blur(20px)',
        duration: 0.6,
        ease: 'power2.in',
      },
      3.8,
    );
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onAnimationComplete(): void {
    this.completeSplash();
  }

  private completeSplash(): void {
    const event = new CustomEvent('splashComplete');
    window.dispatchEvent(event);
  }
}
