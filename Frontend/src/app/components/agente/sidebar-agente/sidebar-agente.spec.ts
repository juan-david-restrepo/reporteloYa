import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarAgente } from './sidebar-agente';

describe('SidebarAgente', () => {
  let component: SidebarAgente;
  let fixture: ComponentFixture<SidebarAgente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarAgente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarAgente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
