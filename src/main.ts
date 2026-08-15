import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// I custom element <swiper-container>/<swiper-slide> (usati dal Bestiario, vedi
// features/bestiary/bestiary.ts) NON si registrano qui: 'swiper/element/bundle' pesa
// ~600kB e sforerebbe il budget del bundle iniziale. Bestiary lo importa dinamicamente
// al proprio ngOnInit, così finisce in un chunk separato caricato solo quando serve.

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
