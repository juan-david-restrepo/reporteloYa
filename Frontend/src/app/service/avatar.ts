import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class Avatar {
  private avatarSubject: BehaviorSubject<string>;
  public avatar$;
  
  private avatarCache: Map<string, string> = new Map();
  private defaultAvatar = 'assets/images/images (3).png';

  constructor(private authService: AuthService) {
    this.avatarSubject = new BehaviorSubject<string>(this.defaultAvatar);
    this.avatar$ = this.avatarSubject.asObservable();

    const userId = this.authService.getUserId();
    if (userId) {
      this.loadAvatarForUser(userId);
    }
  }

  loadAvatarForUser(userId: string | null) {
    if (!userId) {
      this.avatarSubject.next(this.defaultAvatar);
      return;
    }
    
    const cachedAvatar = this.avatarCache.get(userId);
    const avatar = cachedAvatar || this.defaultAvatar;
    this.avatarSubject.next(avatar);
  }

  setAvatarForUser(userId: string | null, avatar: string) {
    if (!userId) return;
    
    this.avatarCache.set(userId, avatar);
    this.avatarSubject.next(avatar);
  }

  getAvatar(): string {
    return this.avatarSubject.value;
  }

  resetAvatar(userId: string | null) {
    if (!userId) return;
    
    this.avatarCache.delete(userId);
    this.avatarSubject.next(this.defaultAvatar);
  }
}
