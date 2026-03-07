import { authGuard } from './guards/auth-guard';
import { Home } from './components/home/home';
import { Login } from './components/login/login';
import { Recuperar } from './components/recuperar/recuperar';
import { Registro } from './components/registro/registro';
import { SubirReporteComponent } from './components/subir-reporte/subir-reporte';
import { Parking } from './components/parking/parking';
import { Agente } from './components/agente/agente';
import { Footer } from './shared/footer/footer';
import { Soporte } from './components/soporte/soporte';
import { PicoPlaca } from './components/pico-placa/pico-placa';
import { Normas } from './components/normas/normas';
import { NoticiasComponent } from './components/noticias/noticias';
import { Perfil } from './components/perfil/perfil';
import { Tareas } from './components/agente/tareas/tareas';
import { Historial } from './components/agente/historial/historial';
import { Reportes } from './components/agente/reportes/reportes';
import { Configuracion } from './components/agente/configuracion/configuracion';
import { Dashboard } from './components/agente/dashboard/dashboard';
import { PerfilAgente } from './components/agente/perfil-agente/perfil-agente';
import { ConfigAdminComponent } from './components/admin/config-admin/config-admin';
import { GestionAgentes } from './components/admin/gestion-agentes/gestion-agentes';
import { MapaReportesComponent } from './components/admin/mapa-reportes/mapa-reportes';
import { SidebarAdmin } from './components/admin/sidebar-admin/sidebar-admin';
import { Admin } from './components/admin/admin';
import { Routes } from '@angular/router';
import { SenalesComponent } from './components/senales/senales';


export const routes: Routes = [
  { path: '', component: Home },
  { path: 'home', component: Home },
  { path: 'login', component: Login },
  { path: 'recuperar', component: Recuperar },
  { path: 'registro', component: Registro },
  { path: 'subir-reporte', component: SubirReporteComponent, canActivate: [authGuard] },
  { path: 'parking', component: Parking, canActivate: [authGuard] },
  { path: 'agente', component: Agente, },
  { path: 'footer', component: Footer },
  { path: 'soporte', component: Soporte },
  { path: 'pico-placa', component: PicoPlaca },
  {path: 'noticias', component: NoticiasComponent},
  {path: 'normas', component: Normas },
  {path: 'perfil', component: Perfil, canActivate: [authGuard]  },
  {path: 'tareas', component: Tareas, },
  {path: 'historial', component: Historial, },
  {path: 'reportes', component: Reportes, },
  {path: 'configuracion', component: Configuracion, },
  {path: 'dashboard', component: Dashboard, },
  {path: 'perfil-agente', component: PerfilAgente, },
  {path: 'gestion-agentes', component: GestionAgentes}, 
  {path: 'sidebar-admin', component: SidebarAdmin},
  {path: 'config-admin', component: ConfigAdminComponent},
  {path: 'mapa-reportes', component: MapaReportesComponent},
  { path: 'admin', component: Admin, },
  { path: 'senales', component: SenalesComponent },
];
