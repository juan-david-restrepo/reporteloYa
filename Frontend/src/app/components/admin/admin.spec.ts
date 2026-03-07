import { ComponentFixture, TestBed } from '@angular/core/testing';

// 1. CORRECCIÓN DE IMPORTACIÓN: Importamos 'AdminComponent', no solo 'Admin'.
import { Admin } from './admin'; 

// 2. CORRECCIÓN EN EL BLOQUE describe: Usamos el nombre de la clase.
describe('AdminComponent', () => { 
  // 3. CORRECCIÓN EN TIPADO: Usamos el nombre de la clase.
  let component: Admin;
  let fixture: ComponentFixture<Admin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // 4. CORRECCIÓN EN imports: Pasamos la clase del componente.
      // Como es un componente standalone, se importa directamente aquí.
      imports: [Admin] 
    })
    .compileComponents();

    // 5. CORRECCIÓN EN CREACIÓN: Usamos el nombre de la clase.
    fixture = TestBed.createComponent(Admin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});