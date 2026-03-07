import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SenalesComponent } from './senales';

describe('Senales', () => {
  let component: SenalesComponent;
  let fixture: ComponentFixture<SenalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SenalesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SenalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
