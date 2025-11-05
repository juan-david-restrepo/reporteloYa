import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../components/modal/modal.component';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, CommonModule, ModalComponent],
  standalone: true,
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav  {
  isSidebarOpen = false;
  isModalOpen = false;
  currentAvatar = 'assets/images/user-1.jpg';

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  openModal() {
    this.isModalOpen = true;
  }

  onAvatarSelected(avatar: string) {
    this.currentAvatar = avatar;
    this.isModalOpen = false;
  }
}
