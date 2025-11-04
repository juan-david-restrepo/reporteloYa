import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Nav } from './shared/nav/nav';
import { Login } from './components/login/login';


export const routes: Routes = [
    {path: '', component: Home},
    {path: 'login', component: Login},
    {path: 'nav', component: Nav},
];
