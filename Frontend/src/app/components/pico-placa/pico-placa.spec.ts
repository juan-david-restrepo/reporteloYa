import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PicoPlaca } from './pico-placa';

describe('PicoPlaca', () => {
  let component: PicoPlaca;
  let fixture: ComponentFixture<PicoPlaca>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PicoPlaca]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PicoPlaca);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
