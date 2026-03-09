import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../service/auth.service';


@Component({
  selector: 'app-sidebar-admin',
  imports: [RouterModule],
  templateUrl: './sidebar-admin.html',
  styleUrl: './sidebar-admin.css',
})
export class SidebarAdmin {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  logout_admin() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
