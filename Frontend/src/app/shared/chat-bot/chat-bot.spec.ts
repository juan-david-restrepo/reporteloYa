import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatBotComponent } from './chat-bot';

describe('ChatBot', () => {
  let component: ChatBotComponent;
  let fixture: ComponentFixture<ChatBotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatBotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatBotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
