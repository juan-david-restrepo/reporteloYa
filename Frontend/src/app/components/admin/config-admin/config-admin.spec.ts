import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigAdminComponent } from './config-admin';

describe('ConfigAdmin', () => {
  let component: ConfigAdminComponent;
  let fixture: ComponentFixture<ConfigAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
