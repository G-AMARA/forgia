Sistema di Prompt: Modern D&D Fantasy Portal ExperienceReference Guide per IA (Palette e Stile)Questo documento serve come riferimento tecnico e stilistico obbligatorio per la generazione di codice front-end e classi utility. L'obiettivo è ricreare un'interfaccia utente in stile Modern Dungeons & Dragons Fantasy, basata su una palette semplificata e integrata con effetti atmosferici.1. CORE PALETTE (Definizione Tecnica)Utilizzare esclusivamente questi nomi e codici HEX durante la configurazione o l'assegnazione diretta dei colori.Nome Colore (Italiano)Nome Tecnico (Inglese)Codice HEXDescrizione StileTenebre Profondefantasy-black#1c1c21Nero freddo di base, per ombre totali e sfondi scuri primari.Blu Notte Metallicofantasy-blue#354a6aBlu ricco, per zone atmosferiche, luce notturna e zone "magiche".Oro Antico Ossidatofantasy-gold#c7a45eOro caldo e brunito, per accenti, icone e titoli importanti.Pietra di Luna Lunarefantasy-moonstone#b8c0c8Grigio pallido opalescente, per testo principale su fondi scuri.Verde Foresta Cupo*fantasy-green#283732Accento raro: per mimetismo, ranger o elementi naturali scuri.Rosso Sangue di Drago*fantasy-red#8d1b1bAccento raro: per draghi, sangue, gemme o drappeggi specifici.* Nota: Verde e Rosso sono colori di accento usati raramente per enfasi tematica specifica.2. SISTEMA DI GRADIENTI ATMOSFERICIL'atmosfera è fondamentale. Usare questi gradienti per simulare profondità e luce magica.A. Gradiente Header (Top Section)Simula l'oscurità totale che si apre su una luce notturna. È un gradiente lineare verticale (dall'alto in basso).JavaScript// Configurazione teorica (o valori arbitrari Tailwind)
'background-image': 'linear-gradient(to bottom, #1c1c21 0%, #243245 50%, #354a6a 100%)'
B. Gradiente Sfondo Principale (Portal Body)Simula una distesa magica che transita tra l'oscurità blu e gli accenti dorati pale.JavaScript// Configurazione teorica (o valori arbitrari Tailwind)
'background-image': 'linear-gradient(to bottom right, #2f3e58 0%, #354a6a 50%, #9e8a5b 100%)'
3. EFFETTI DI LUCE (Glow / Drop Shadow Plugin)Gli elementi magici e metallici devono avere un leggero bagliore esterno.A. Bagliore Dorato (Gold Glow)Utilizzato su icone dorate (fantasy-gold) o bottoni attivi.CSSbox-shadow: 0 0 15px rgba(199, 164, 94, 0.7);
filter: drop-shadow(0 0 5px rgba(199, 164, 94, 0.9));
B. Bagliore Blu Runico (Rune Glow)Utilizzato su simboli magici o effetti arcani (fantasy-blue).CSSbox-shadow: 0 0 15px rgba(53, 74, 106, 0.7);
filter: drop-shadow(0 0 5px rgba(53, 74, 106, 0.9));
4. ASSIGNAZIONE SEMANTICA (Reference per Layout)Area / ElementoConfigurazione StileClassi Tailwind Esempio (se configurato)Sfondo Body PrincipaleGradiente Portal Bodybg-body-portal (configurato)Sfondo Sezione HeaderGradiente Headerbg-header-portal (configurato)Pannelli Contenuto ScuriTenebre Profonde + Bordo Oro (opaco)bg-fantasy-black border border-fantasy-gold/20Titoli PrincipaliOro Antico Ossidatotext-fantasy-goldTesto del CorpoPietra di Luna Lunaretext-fantasy-moonstoneIcone InterattiveOro Antico Ossidato + Gold Glowtext-fantasy-gold glow-gold (plugin custom)Simboli Magici/RuneBlu Notte Metallico + Rune Glowtext-fantasy-blue glow-blue (plugin custom)5. ESEMPIO DI CODICE GENERATO (Scenario)Se l'utente chiede: "Crea una card per un incantesimo scuro", l'IA dovrebbe generare:HTML<!-- Card Incantesimo basata sul Sistema Fantasy -->
<div class="bg-fantasy-black p-6 rounded-lg border border-fantasy-gold/30 shadow-xl max-w-sm">
  <div class="flex items-center gap-3 mb-4">
    <!-- Icona Runica -->
    <div class="text-fantasy-blue text-4xl glow-blue">&#161;</div>
    <h3 class="font-fantasy-title text-2xl text-fantasy-gold tracking-tight">Palla di Fuoco Oscura</h3>
  </div>
  <p class="text-fantasy-moonstone text-sm mb-4">
    Crea un'esplosione di fiamme intrise di tenebre profonda. Infligge 8d6 danni necrotici.
  </p>
  <button class="w-full bg-fantasy-gold text-fantasy-black py-2 rounded font-bold hover:bg-fantasy-moonstone transition glow-gold">
    Lancia Incantesimo
  </button>
</div>