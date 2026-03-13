
# Reglas del Proyecto ReporteloYa

## Estructura de Carpetas

Frontend/src/app/
├── components/       # Páginas/componentes principales
│   ├── home/
│   ├── login/
│   ├── admin/
│   └── agente/
├── service/           # Servicios (lógica de negocio)
├── models/            # Interfaces/tipos de datos
├── guards/            # Guards de rutas
├── shared/            # Componentes reutilizables (nav, footer, chat-bot)
└── app.routes.ts      # Rutas principales


## Convenciones de Nomenclatura

### Componentes
- **Carpeta**: kebab-case (ej: `subir-reporte/`, `gestion-agentes/`)
- **Archivos**: mismo nombre que la carpeta (`subir-reporte.ts`, `subir-reporte.html`, `subir-reporte.css`)
- **Clase**: PascalCase (ej: `Home`, `Login`, `GestionAgentes`)
- **Selector**: `app-nombre` (ej: `app-home`, `app-login`)

### Servicios
- **Archivo**: `.service.ts` (ej: `auth.service.ts`)
- **Clase**: PascalCase con sufijo `Service` (ej: `AuthService`, `ReportesService`)

### Modelos/Interfaces
- **Archivo**: `.model.ts` (ej: `reporte.model.ts`)
- **Interfaz**: PascalCase (ej: `Reporte`, `AuthUser`)

### Rutas
- **Path**: kebab-case (ej: `subir-reporte`, `pico-placa`, `gestion-agentes`)

## Patrones de Código

### Componentes Angular (Standalone)


@Component({
  selector: 'app-nombre',
  standalone: true,
  imports: [CommonModule, Nav, RouterModule, ...],
  templateUrl: './nombre.html',
  styleUrls: ['./nombre.css'],
})
export class Nombre implements OnInit, OnDestroy {
  constructor(private servicio: Servicio) {}

  ngOnInit() { ... }
  ngOnDestroy() { ... }
}


### Servicios


@Injectable({ providedIn: 'root' })
export class NombreService {
  private apiUrl = 'http://localhost:8080/api/...';
  
  constructor(private http: HttpClient) {}
}

### Guards (Funcionales)

export const authGuard: CanActivateFn = () => { ... };


### Modelos


export interface Reporte {
  id: number;
  placaAgente: string;
  fecha: string;
}


## Reglas de Estilo

- Usar `standalone: true` en todos los componentes
- Imports en una línea cuando sea posible, si son muchos agrupar por tipo
- Preferir `templateUrl` y `styleUrls` sobre templates inline
- Usar `CommonModule` para funcionalidades básicas de Angular
- Usar `RouterModule` o `RouterLink` para navegación
- Usar `ReactiveFormsModule` para formularios
- Usar `Swal` (SweetAlert2) para alertas

## Comunicación

Cuando me pidas hacer algo o cambiar algo, siempre te explicaré:
1. **Qué hice** - Resumen de la acción
2. **Cómo lo hice** - Explicación técnica breve
3. **Por qué** - Si es relevante para el contexto

## Ejecución de Comandos

- Frontend: `ng serve` (puerto 4200)
- Backend: ejecutar desde IDE o Maven (puerto 8080)
- No ejecutar comandos de build sin verificar primero
=======
Reglas de Estilo
Usar standalone: true en todos los componentes
Imports en una línea cuando sea posible, si son muchos agrupar por tipo
Preferir templateUrl y styleUrls sobre templates inline
Usar CommonModule para funcionalidades básicas de Angular
Usar RouterModule o RouterLink para navegación
Usar ReactiveFormsModule para formularios
Usar Swal (SweetAlert2) para alertas
Comunicación
Cuando me pidas hacer algo o cambiar algo, siempre te explicaré:

Qué hice - Resumen de la acción
Cómo lo hice - Explicación técnica breve
Por qué - Si es relevante para el contexto
Ejecución de Comandos
Frontend: ng serve (puerto 4200)
Backend: ejecutar desde IDE o Maven (puerto 8080)
No ejecutar comandos de build sin verificar primero

## Añadir

Comenta simepre el codigo cuando lo agregues para que 
sirve y donde se utiliza y para que se utiliza 