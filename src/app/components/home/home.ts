import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Nav } from '../../shared/nav/nav';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule, Nav],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {

}
