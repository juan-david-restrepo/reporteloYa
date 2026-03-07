import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class Avatar {
  private avatarSubject: BehaviorSubject<string>;
  public avatar$;

  constructor(private authService: AuthService) {
    // Inicializa con avatar por defecto
    this.avatarSubject = new BehaviorSubject<string>('assets/images/images (3).png');
    this.avatar$ = this.avatarSubject.asObservable();

    // 🔹 Intentar cargar avatar al iniciar la app si hay usuario logueado
    const userId = this.authService.getUserId();
    if (userId) {
      this.loadAvatarForUser(userId);
    }
  }

  /**
   * Carga el avatar de un usuario específico desde localStorage
   * @param userId ID del usuario logueado
   */
  loadAvatarForUser(userId: string | null) {
    if (!userId) {
      this.avatarSubject.next('assets/images/images (3).png');
      return;
    }
    const savedAvatar = localStorage.getItem(`avatar_${userId}`);
    this.avatarSubject.next(savedAvatar || 'assets/images/images (3).png');
  }

  /**
   * Guarda el avatar de un usuario específico en localStorage y lo propaga globalmente
   * @param userId ID del usuario logueado
   * @param avatar Nueva URL/base64 del avatar
   */
  setAvatarForUser(userId: string | null, avatar: string) {
    if (!userId) return;
    localStorage.setItem(`avatar_${userId}`, avatar);
    this.avatarSubject.next(avatar);
  }

  /**
   * Obtener avatar actual de forma sincrónica
   */
  getAvatar(): string {
    return this.avatarSubject.value;
  }

  /**
   * Resetear el avatar de un usuario a valor por defecto
   * @param userId ID del usuario logueado
   */
  resetAvatar(userId: string | null) {
    if (!userId) return;
    localStorage.removeItem(`avatar_${userId}`);
    this.avatarSubject.next('assets/images/images (3).png');
  }
}