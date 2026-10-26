# Tests & synthetische Fixtures

* `bun test` (aus `save-import/`) – `test/unbound-save.test.ts` (Parser) und `test/synthetic-fixtures.test.ts` (nur erfundene Daten).
* `tools/synth-lib.ts` – unabhängiger Save-Schreiber (Prüfsumme, Sektor-Rotation, Gen-3-Text, Box-/Party-Mons, Beschädigungen).
* `tools/gen-synthetic-saves.ts` – definiert alle Szenarien, schreibt `fixtures-synthetic/<name>.sav` + `<name>.expected.json`. `--check` prüft Reproduzierbarkeit.
* `src/save-diff.ts` – `diffSaves(a, b)` → added / removed / moved / changed / dex („neu seit letztem Import", Identität PID+OTID). Additiv, kein Teil des Parsers.
* Szenarioliste, Expected-Format, Annahmen: `fixtures-synthetic/README.md`.

## Neues Szenario hinzufügen
1. In `buildFixtures()` (gen-synthetic-saves.ts) einen Block mit `new Fx('name')`, `fill(...)`, `finish('name', st, {...})` ergänzen.
2. `bun run tools/gen-synthetic-saves.ts`, dann `bun test`. Das Expected-JSON wird aus dem *Generator-Modell* berechnet (nicht aus dem Parser). Weicht der Parser ab, ist das ein Befund – erst prüfen, ob Parser oder Modell falsch liegt.
3. Annahmen in `unverified:` eintragen.

## Mutationsprobe (manuell, einmalig)
Gegen eine Kopie des Parsers wurden Fehler eingebaut (Shiny-Schwelle, Slot-Wahl, Prüfsummenlängen, Hatched-Regel, Box-Sektor-Länge, Ei-Bit, OT-Vergleich, Signatur/Index-Prüfung): jeder wurde von mindestens einem Test erkannt.
