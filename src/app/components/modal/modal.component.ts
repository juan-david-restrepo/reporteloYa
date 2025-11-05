import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-avatar-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
  @Input() isOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>(); // <--- para two-way binding
  @Output() avatarSelected = new EventEmitter<string>();

  selectedAvatar = 'assets/images/user-1.jpg';

  avatars: string[] = [
    'assets/images/user-1.jpg',
    'assets/images/user-2.jpg',
    'assets/images/user-3.jpg',
    'assets/images/user-4.jpg',
    'assets/images/user-5.jpg',
    'assets/images/user-6.jpg',
    'assets/images/user-7.jpg',
    'assets/images/user-8.jpg',
    'assets/images/user-9.jpg',
    'assets/images/user-10.jpg',
  ];

  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
  }

  closeModal() {
    this.isOpen = false;
    this.isOpenChange.emit(false);
  }

  saveAvatar() {
    this.avatarSelected.emit(this.selectedAvatar);
    this.closeModal();
  }
}
