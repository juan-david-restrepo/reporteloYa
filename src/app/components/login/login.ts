import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Registro } from '../registro/registro';
import { Recuperar } from '../recuperar/recuperar';

@Component({
  selector: 'app-login',
  imports: [RouterLink, CommonModule, Registro, Recuperar],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

}
