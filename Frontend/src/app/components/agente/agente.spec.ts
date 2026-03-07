import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Agente } from './agente';

describe('Agente', () => {
  let component: Agente;
  let fixture: ComponentFixture<Agente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Agente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Agente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
