import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Nav } from './shared/nav/nav';
import { Login } from './components/login/login';
import { Recuperar } from './components/recuperar/recuperar';
import { Registro } from './components/registro/registro';
import { ChatBotComponent } from './shared/chat-bot/chat-bot';
import { ModalComponent } from './components/modal/modal.component';


export const routes: Routes = [
    {path: '', component: Home},
    {path: 'login', component: Login},
    {path: 'nav', component: Nav},
    {path: 'recuperar', component: Recuperar},
    {path: 'registro', component: Registro},
    {path: 'chat-bot', component: ChatBotComponent},
    {path: 'modal', component: ModalComponent}
];
