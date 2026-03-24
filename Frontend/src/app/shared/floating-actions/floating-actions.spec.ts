import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingActionsComponent } from './floating-actions';

describe('FloatingActions', () => {
  let component: FloatingActionsComponent;
  let fixture: ComponentFixture<FloatingActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingActionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FloatingActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
