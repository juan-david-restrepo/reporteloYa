import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilAgente } from './perfil-agente';

describe('PerfilAgente', () => {
  let component: PerfilAgente;
  let fixture: ComponentFixture<PerfilAgente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilAgente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PerfilAgente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
