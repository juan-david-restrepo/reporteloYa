import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Nav } from './shared/nav/nav';
import { Login } from './components/login/login';
import { Recuperar } from './components/recuperar/recuperar';
import { Registro } from './components/registro/registro';


export const routes: Routes = [
    {path: '', component: Home},
    {path: 'login', component: Login},
    {path: 'nav', component: Nav},
    {path: 'recuperar', component: Recuperar},
    {path: 'registro', component: Registro},
];
