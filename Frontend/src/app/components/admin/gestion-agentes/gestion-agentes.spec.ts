import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionAgentes } from './gestion-agentes';

describe('GestionAgentes', () => {
  let component: GestionAgentes;
  let fixture: ComponentFixture<GestionAgentes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionAgentes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionAgentes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
