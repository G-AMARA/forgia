VTT — Plancia di gioco: come è fatta
Il quadro generale
Tutto vive sotto /gioca/:campaignId. È una pagina a schermo intero con due parti:

la mappa (sempre a tutto schermo, sotto)
un pannello laterale a scomparsa (sopra, si apre/chiude) diverso per Master e Giocatore
Master e Giocatori vedono la stessa plancia in tempo reale grazie a un canale Supabase Realtime (broadcast, non database "live") + alcune cose salvate su DB per chi entra dopo o ricarica la pagina.

I pezzi principali, dall'esterno verso l'interno
Componente	Cosa fa
Play	La pagina stessa. Tiene lo stato generale (mappa attiva, chi è il Master, drawer aperto/chiuso) e fa da "postino" tra i pezzi sotto.
PlaySessionChannel	Il servizio che parla con Supabase Realtime. Manda e riceve: cambio mappa, spostamento pedine, modifiche nebbia, "qualcosa è cambiato ricarica". Play non parla mai direttamente col canale, passa sempre da qui.
PlayMasterPanel / PlayCharacterPanel	Il contenuto del pannello laterale: per il Master (bestiario, mappe, note), per il Giocatore (la sua scheda compatta).
PlayMapPanel	Un guscio sottile che passa dati/eventi tra Play e la plancia vera e propria. Non fa logica.
InteractiveBoardComponent	La plancia. Mostra l'immagine della mappa, la griglia, la nebbia e le pedine. Gestisce zoom/pan col mouse o le dita.
Dentro la plancia (InteractiveBoardComponent)
La plancia da sola faceva troppe cose, quindi il lavoro è diviso in servizi (logica, senza grafica) e componenti piccoli (solo grafica):

Servizi (logica):

BoardViewport — zoom, trascinamento della mappa, reset vista, schermo intero.
TokenDrag — capisce se stai trascinando una pedina o hai solo fatto un tap (per selezionarla), e gestisce il movimento.
FogDrawing — quando il Master è in "modalità nebbia", gestisce il rettangolo che sta disegnando.
Componenti (grafica):

BoardTokenComponent — disegna una singola pedina (cerchio, bordo colorato, nome al passaggio del mouse).
TokenContextMenuComponent — il menu che si apre col tasto destro/tocco lungo su una pedina: rimuovi, blocca, mostra/nascondi, guarda meglio.
TokenDpadComponent — le freccette che compaiono su mobile per spostare la pedina selezionata (più comodo del dito sullo schermo piccolo).
MonsterCardModalComponent — la scheda grande con l'immagine del mostro/PG, si apre dal menu contestuale.
FogOfWarComponent — disegna il velo scuro della nebbia sopra la mappa.
FogToolbarComponent — i 3 bottoni del Master per gestire la nebbia (rivela/copri/reset).
La nebbia di guerra (Fog of War)
FogOfWarStore — tiene in memoria e salva su DB due liste di rettangoli: quelli rivelati e quelli coperti (i coperti "ricoprono" sopra i rivelati, così coprire un pezzetto non cancella tutta la rivelazione sotto).
Il Master vede la nebbia semi-trasparente (riferimento), il Giocatore la vede nera piena.
Il proprio personaggio resta sempre visibile anche nel buio (con un bordo tratteggiato), per non "perderlo" per sempre.
Le pedine (token)
CampaignTokens (servizio generale, non solo della plancia) — crea/sposta/rimuove/blocca/nasconde le pedine sul database.
Il Master può evocare un mostro dal Bestiario ("Piazza sulla Mappa"), il Giocatore può piazzare il proprio personaggio.
Un personaggio non può avere due pedine nella stessa campagna: lo garantisce un vincolo nel database, non solo il codice.
Ogni personaggio ha un colore di bordo diverso (proprio PG = oro, alleati = grigio, mostri = rosso).
Come si tengono sincronizzati Master e Giocatori
Tutto passa dal canale play-session:<campagna>:

Quando succede qualcosa (muovi una pedina, cambi mappa, disegni nebbia) lo si applica subito in locale (per non avere scatti) e poi lo si manda agli altri via broadcast.
Chi riceve applica lo stesso cambiamento senza dover ricaricare tutto da zero.
Il broadcast da solo non basta: se non eri collegato quando è successo qualcosa, non lo ricevi mai. Per questo la mappa attiva e le pedine sono anche salvate su database — chi entra dopo o ricarica la pagina le ritrova.
Cose salvate sul database (nuove tabelle/colonne)
campaign_tokens — le pedine (posizione, chi le possiede, bloccata/nascosta).
map_fog_state — le aree di nebbia rivelate/coperte per ogni mappa.
campaigns.active_map_id — quale mappa è attiva ora per la campagna.
Le regole di permesso (RLS) dicono chi può leggere/scrivere cosa: in generale il Master può tutto, il Giocatore può leggere ciò che serve per giocare e muovere solo le proprie cose.

Cose volutamente lasciate semplici (non bug, scelte)
"Copri" la nebbia rimuove/ricopre per rettangoli, non è un editor di forme libere.
Lo snap alla griglia funziona bene per pedine di taglia normale, non è perfetto per quelle grandi 2x2+.
Zoom/pan sono un'esperienza personale: non sincronizzati tra utenti (ognuno guarda dove vuole).