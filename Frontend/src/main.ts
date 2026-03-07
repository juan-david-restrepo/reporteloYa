(window as any).global = window;
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    ...appConfig.providers
  ]
}).catch(err => console.error(err));