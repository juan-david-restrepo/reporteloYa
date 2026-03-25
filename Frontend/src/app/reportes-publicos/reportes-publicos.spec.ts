import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportesPublicos } from './reportes-publicos';

describe('ReportesPublicos', () => {
  let component: ReportesPublicos;
  let fixture: ComponentFixture<ReportesPublicos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportesPublicos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportesPublicos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
