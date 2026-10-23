# Soul-Link Tracker

Privater Nuzlocke-Tracker für Fisi und Seri, Pokémon Azure Platinum. Installierbare PWA, Deutsch, dunkel als Standard.

## Lokal

```bash
npm install
npm run dev
```

Der Dev-Server nutzt den Basispfad `/azure-soullink-tracking/`.

## Live

GitHub Pages (Source: GitHub Actions) veröffentlicht `main` nach `.github/workflows/pages.yml`.

Geplante Adresse: https://xcricketz.github.io/azure-soullink-tracking/

Falls Pages noch auf „Deploy from a branch“ steht: Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Anmeldung

Auf „Wer bist du?“ Fisi oder Seri wählen und den gemeinsamen Geheimcode eingeben. Die App ruft `signInWithPassword` mit `fisi@soullink.app` bzw. `seri@soullink.app` auf. Die Session bleibt gespeichert. „Spieler wechseln“ unter Mehr meldet ab.

Die Zeilen in `players` sind mit den bestehenden Auth-Nutzern verknüpft. Wenn die Konten neu angelegt werden, `supabase/migrations/20261023120000_reset_and_link.sql` ausführen. Dieselbe Datei legt `reset_run` an, damit „Run zurücksetzen“ beide Fanglisten löscht. Ohne die Funktion kann jede Seite nur die eigenen Fänge löschen. „Ja, beide“ und „Wiederbeleben“ nutzen das vorhandene `set_pair_status`.
