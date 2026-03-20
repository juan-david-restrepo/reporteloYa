import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarAdmin } from '../sidebar-admin/sidebar-admin';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-config-admin',
  templateUrl: './config-admin.html',
  styleUrls: ['./config-admin.css'],
  standalone: true,
  imports: [RouterModule, SidebarAdmin, FormsModule]
})
export class ConfigAdminComponent implements OnInit {

  fontSizeValue: number = 15;

  ngOnInit() {
    this.loadSettings();
  }

  private loadSettings() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');

    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
      this.fontSizeValue = parseInt(savedSize);
      document.body.style.setProperty('--admin-font-size', savedSize + 'px');
    } else {
      document.body.style.setProperty('--admin-font-size', '15px');
      localStorage.setItem('fontSize', '15');
    }
  }

  toggleDarkMode(event: any) {
    const isChecked = event.target.checked;
    if (isChecked) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', isChecked.toString());
  }

  changeFontSize(event: any) {
    const size = typeof event === 'number' ? event : event.target.value;
    this.fontSizeValue = size;
    document.body.style.setProperty('--admin-font-size', size + 'px');
    localStorage.setItem('fontSize', size);
  }

  resetFontSize() {
    this.fontSizeValue = 15;
    document.body.style.setProperty('--admin-font-size', '15px');
    localStorage.setItem('fontSize', '15');
  }

  get isDarkActive(): boolean {
    return document.body.classList.contains('dark-mode');
  }
}