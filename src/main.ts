import { bootstrapApplication } from '@angular/platform-browser';
import { register } from 'swiper/element/bundle';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Registra i custom element <swiper-container>/<swiper-slide> una sola volta, all'avvio:
// usati dal carosello del Bestiario (vedi features/bestiary/bestiary.ts).
register();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
