import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Normas } from './normas';

describe('Normas', () => {
  let component: Normas;
  let fixture: ComponentFixture<Normas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Normas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Normas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
