// Registrato al volo (non in main.ts): il bundle di swiper/element include tutti i moduli
// (~600kB) e sforerebbe il budget del bundle iniziale se caricato eagerly. Condiviso tra
// Bestiary e Npc (entrambi usano <swiper-container> a mazzo di carte): richiamare
// register() una seconda volta lancia (customElements.define sullo stesso tag), da qui il
// guard a livello di modulo condiviso tra i due componenti.
let swiperRegistered: Promise<void> | null = null;

export function ensureSwiperRegistered(): Promise<void> {
  if (!swiperRegistered) {
    swiperRegistered = import('swiper/element/bundle').then(({ register }) => register());
  }
  return swiperRegistered;
}
