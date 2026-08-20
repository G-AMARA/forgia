-- Difesa Senza Armatura (Barbaro: 10 + Des + Cos, Monaco: 10 + Des + Sag, ecc.): quale
-- caratteristica extra si somma a Destrezza quando la classe non indossa armatura, invece
-- di limitarsi a 10 + Des. Chiave caratteristica (str/dex/cos/int/wis/cha) o null se la
-- classe non ha questo tratto. Generico invece che una colonna booleana "è il Barbaro":
-- il nome della classe è testo libero modificabile in Gestione (mai un identificatore
-- stabile), quindi va configurato esplicitamente per classe, non dedotto dal nome.
alter table classes add column if not exists unarmored_defense_ability text;
