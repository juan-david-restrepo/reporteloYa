import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Websocket } from './websocket';

describe('Websocket', () => {
  let component: Websocket;
  let fixture: ComponentFixture<Websocket>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Websocket]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Websocket);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
