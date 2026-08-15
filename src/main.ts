import { bootstrapApplication } from '@angular/platform-browser';
import { register } from 'swiper/element';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Registra i custom element <swiper-container>/<swiper-slide> una sola volta, all'avvio:
// usati dal carosello del Bestiario (vedi features/bestiary/bestiary.ts). Import da
// 'swiper/element' (non '/bundle'): il bundle include tutti i moduli di Swiper
// (autoplay, zoom, virtual, tutti gli effetti...) e da solo sforava il budget della
// build di produzione di +600kB; i singoli moduli usati (Navigation, EffectCards) sono
// passati per-istanza tramite [modules] in bestiary.ts.
register();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
