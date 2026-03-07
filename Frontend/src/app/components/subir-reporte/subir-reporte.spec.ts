import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubirReporteComponent } from './subir-reporte';

describe('SubirReporte', () => {
  let component: SubirReporteComponent;
  let fixture: ComponentFixture<SubirReporteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubirReporteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubirReporteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
