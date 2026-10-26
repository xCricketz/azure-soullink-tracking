# Synthetische Unbound-Save-Fixtures

Kleine (128 KiB) **vollständig erfundene** `.sav`-Dateien samt `*.expected.json`, erzeugt von `tools/gen-synthetic-saves.ts`.
Sie enthalten **keinen** Inhalt aus ROM oder echtem Save (nur das Format ist aus dem echten Save abgeleitet, siehe SPEC.md); Spitznamen/OT/TID sind erfunden
(Spieler „Synth", TID 40001/SID 12345; fremde OT 51111/2222). PIDs sind deterministisch aus dem Fixture-Namen abgeleitet → regenerieren ergibt byte-identische Dateien.
Die `.sav`-Dateien dürfen committet werden (`!fixtures-synthetic/*.sav` in `.gitignore`).

## Neu erzeugen / prüfen
```
bun run tools/gen-synthetic-saves.ts           # schreibt nach fixtures-synthetic/
bun run tools/gen-synthetic-saves.ts --check   # vergleicht mit den vorhandenen Dateien (Exit 1 bei Abweichung)
bun run tools/gen-synthetic-saves.ts --out DIR # anderes Zielverzeichnis
bun test                                       # alle Tests (test/unbound-save.test.ts + test/synthetic-fixtures.test.ts)
```
Der Generator importiert den Parser **nicht** (unabhängige Implementierung von Prüfsumme, Gen-3-Textcodec, EXP-Kurven, Sektor-Rotation) – die Tests sind damit ein Gegenprüfung, kein Selbsttest.

## Format des Expected-JSON
`fixture, file, description, unverifiedAssumptions[], fileSize, slots[{slot,valid,saveIndex,problemsContain}], error?, activeSlot, checksumsOk, trainer, currentBox, boxNames, party[], boxMons[], dex, ownedSpeciesNat, progress, warnings{count,contain}`.
Jeder Mon: `where, box, slot, speciesId, nat, formIndex, level, levelSource, nickname, nature, shinyXor, shiny, isEgg, ball/ballName, ot{name,tid,sid,own}, met{location,level,category}, routeId` (routeId aus `data/mapsec-to-route.json`, `null` = kein Soullink-Route-Fundort).
`box-layout` nutzt ein kompaktes Format (750 Slots). `diff-a-to-b.expected.json` ist die erwartete Differenz (`src/save-diff.ts`).

## Szenarien
| Fixture | Beschreibung |
|---|---|
| `blank-ff` | Komplett gelöschter Flash (alles 0xFF): kein gültiger Slot → Parser muss einen Fehler werfen. |
| `blank-zero` | Datei nur aus Nullen: kein gültiger Slot (Sektor-IDs doppelt, Signatur 0) → Fehler. |
| `box-layout` | Alle 25 × 30 = 750 Box-Slots belegt (jeder Mon eindeutig per Spitzname „B<box>S<slot>", PID, EXP). Deckt alle Sektorgrenzen der Box-Speicherung ab (Sektor 5…13, Dateisektoren 30/31 für Boxen 20–22, Sektor 2/3 für Boxen 23–24, Sektor 0 für Box 25). Custom-Boxnamen (Box 25 mit 9 Zeichen), aktuelle Box = 18 (Index 17). |
| `cherish-fossil` | Cherish-Ball-Geschenke (Seaport City 119, Lv 50) und Fossil-Mons (Gurun Town 122, Lv 25). Der Parser kann Geschenk/Fossil nicht von Wildfängen unterscheiden: Kategorie bleibt area, Ball (Cherish=15) ist das einzige Indiz. |
| `diff-a` | Diff-Paar, Stand A („erster Import"): Starter im Team, 6 Box-Mons in Box 1/2. Gegenstück: diff-b.sav; erwartete Differenz: diff-a-to-b.expected.json. |
| `diff-b` | Diff-Paar, Stand B (nach weiterem Spielen; gespeichert in Slot 1 Index 22, Slot 0 hält noch Stand A): +7 Neufänge, 1 Entwicklung, 1 Level-Up, 1 Box→Team-Verschiebung, 1 Freilassung (mit Wiederverwendung des Slots). Siehe diff-a-to-b.expected.json. |
| `duplicates-same-route` | Mehrere Mons derselben Spezies auf derselben Route (Rattata Route 2: 8 Stück inkl. Team und anderer Box; dazu Alola-Form, gleiche PID bei anderer OT-ID, andere Route). Der Parser darf nichts zusammenfassen/dedupen; jede Instanz einzeln. `duplicateCounts` = Anzahl je (Fundort:National-Nr.:Formindex). |
| `eggs` | Eier in Team und Box: Erkennung über IV-Wort-Bit 30 und/oder Flag-Byte-Bit 2 (0x13). Eier: isEgg=true, Spitzname leer (Platzhalter „Egg" wird ausgeblendet), Fundort 253 (special-egg), nicht im Dex/ownedSpeciesNat. |
| `empty-save` | Frischer Save ohne Pokémon: Team leer, 25 Boxen leer, Dex leer, keine Orden. Beide Slots gültig (Index 3/2). |
| `event-fateful` | Event/Geschenk-Mons: Fundort 255 (fateful encounter), fremde OT, Cherish Ball (ID 15); Randfälle mit eigener OT bzw. anderem Ball. Kategorie fateful-event. |
| `evolutions-forms-gen8` | Entwicklungen und Formen: Mon mit späterer Entwicklungsstufe (Fundort/Fang-Level der Basisform), Mega/Alola/Pikachu/Deoxys/Arceus-Formen (formIndex>0), Species-IDs >386 und >1000 (u16, hohes Byte genutzt: 511/512/1023/1024/1293), Gen-7- und Gen-8-National-Nummern bis 905. Erwartet: speciesId, nat, formIndex, name stimmen mit data/species-table.json überein. |
| `flashcart-header` | Save mit 16 Byte Flashcart-Header vorneweg (0x20010 Byte). Parser schneidet den Header ab; fileSize = 0x20010. |
| `hatched` | Geschlüpfte Mons: Fang-Level (Origins Bits 0–6) = 0, Fundort = Schlupfort (Redwood Village 146, Seaport 119, Grenzen 88/196). Kategorie hatched; Randfall Fang-Level 1 → area. |
| `ingame-trade` | Ingame-Tausch: Fundort 254, fremde OT (TID/SID abweichend), Poké Ball, meist Level 50; dazu ein Randfall mit Fundort 254 und eigener OT (ownOT=true, Kategorie bleibt in-game-trade). Kategorie kommt allein aus dem Fundort. |
| `level-exp-edges` | Level-aus-EXP an den Schwellen aller 6 Wachstumsraten: EXP = Schwelle(L) und Schwelle(L)−1 für L ∈ {2,10,15,16,35,36,50,51,68,69,98,99,100} (Kurvenknicke von Erratic/Fluctuating), EXP 0, EXP > Lv-100-Schwelle, 0xFFFFFFFF. Im Team: gespeichertes Level hat Vorrang vor EXP (levelSource=stored; hier absichtlich Level 7 bei Lv-100-EXP). Erwartetes Level kommt aus generator-eigener Kurvenimplementierung. |
| `met-location-edges` | Fundort-/Kategorie-Randfälle: 87 und 197 (knapp außerhalb 88..196 → unknown-location), 88/196 (Grenzen), Vanilla-IDs, 0 (none), 252, 253 (special-egg), 254, 255, Fang-Level 0/1/127, fremdes Herkunftsspiel (0,1,2,3,5,6,15 → foreign-origin; Spiel-ID 4 = FireRed), OT-Geschlecht, Origins-Bit 11, Ball-IDs. Letzte 6 Mons liegen im Team (Party-Layout, Fundort @0x45/Origins @0x46/Ball @0x2A), der Rest in Box 1. |
| `natures-all` | Alle 25 Naturen (PID % 25 = 0..24) in Box 1, Slot 1–25. Nature-Mint-Überschreibung ist im Save-Format unbekannt (SPEC §5.4). |
| `party-count-mismatch` | Party-Zähler (u32 @0x34) = 3, obwohl 6 Mons geschrieben sind: der Parser muss genau 3 lesen (keine Warnung). |
| `party-count-overflow` | Party-Zähler = 7 (>6, ungültig): der Parser liest 6 Mons und meldet eine Warnung „Party-Zähler 7 > 6". |
| `party-hole` | Team-Zähler 3, aber Slot 2 (Index 1) ist leer (nur Nullen): der Parser überspringt den leeren Slot (2 Mons), behält aber die Slot-Nummern 0 und 2. |
| `party-six` | Volles Team (6 × 100-Byte-Party-Mons): stored Level, Fundort/Origins @0x45/0x46, Ball @0x2A, Hidden-Ability, Ei, Tausch, Event, geschlüpft+shiny. Boxen leer. |
| `progress-dex` | Fortschritt/Dex ohne Mons: Dex-Bitfelder an den Rändern (National-Nr. 1, 8, 9, 255, 256, 905, 1000 = letztes Bit des 125-Byte-Felds), gefangen-ohne-Mon, 5 Orden (Flags 0x820–0x824), Game-Clear (0x82C), 4 zählbare Hall-of-Fame-Einträge (+3 nicht zählbare), Spielzeit-Randwerte (999:59:59, Frames 59). |
| `shiny-edges` | Shiny-Randfälle: shinyXor = TID^SID^PID_hi^PID_lo genau bei 0,1,7,8,9,15,16,17,31,32,255,0xFFFF (Vanilla-Schwelle <8, Parser-Annahme <16), Fremd-OT mit TID/SID 0 bzw. 0xFFFF, PID 0 / 0xFFFFFFFF / High-Bits. Geprüft werden shinyXor (exakt) und das Parser-Flag shiny == (xor < 16). Das Flag ist Parser-Konvention, NICHT belegt (SPEC §5.4). |
| `signature-vanilla` | Alle Sektoren tragen die Vanilla-Gen-3-Signatur 0x08012025 statt 0x01121999: Prüfsummen gültig → Save wird gelesen, Parser warnt aber vor möglichem anderem Layout. |
| `slot-damage-outside-checksum` | Bytes jenseits der Prüfsummenlänge – jeweils direkt am ersten ungeschützten Byte (0xD98 / 0x450 / 0xF24) und weiter hinten – (Sektor 4 ab 0xD98, Sektor 13 ab 0x450, Sektor 0 ab 0xF24 = CFRU-Erweiterungsbereiche) werden verändert: die Prüfsumme bemerkt es nicht, Slot bleibt gültig und aktiv (SPEC §2 / §9). |
| `slot-fallback-boundary-s0` | Grenzfall Prüfsummenlänge: das LETZTE geschützte Byte von Sektor 0 (Offset 0xf23) im neueren Slot 0 ist gekippt → Slot ungültig → Fallback auf Slot 1. (Gegenstück: slot-damage-outside-checksum am ersten ungeschützten Byte.) |
| `slot-fallback-boundary-s13` | Grenzfall Prüfsummenlänge: das LETZTE geschützte Byte von Sektor 13 (Offset 0x44f) im neueren Slot 0 ist gekippt → Slot ungültig → Fallback auf Slot 1. (Gegenstück: slot-damage-outside-checksum am ersten ungeschützten Byte.) |
| `slot-fallback-boundary-s4` | Grenzfall Prüfsummenlänge: das LETZTE geschützte Byte von Sektor 4 (Offset 0xd97) im neueren Slot 0 ist gekippt → Slot ungültig → Fallback auf Slot 1. (Gegenstück: slot-damage-outside-checksum am ersten ungeschützten Byte.) |
| `slot-fallback-checksum` | Neuerer Slot 0 (Index 201) hat ein verfälschtes Prüfsummenfeld in Sektor 1 → Parser muss auf Slot 1 (Index 200, älterer Stand mit nur 2 Mons) zurückfallen; activeSlot=1, checksumsOk=false. |
| `slot-fallback-data` | Neuerer Slot 1 (Index 201) hat ein gekipptes Datenbyte in Sektor 5 (Box-Daten) → Prüfsumme falsch → Fallback auf Slot 0 (Index 200, älterer Stand). |
| `slot-fallback-dup-id` | Im neueren Slot 0 hat ein Sektor die ID eines anderen Sektors (ID doppelt, eine fehlt) → Slot ungültig → Fallback auf Slot 1. |
| `slot-fallback-signature` | Ein Sektor des neueren Slots 1 hat eine abweichende Signatur → Slot ungültig → Fallback auf Slot 0. |
| `slot-fallback-torn-write` | Torn Write: ein Sektor des neueren Slots 0 trägt noch den alten Save-Index 200 (Strom weg beim Speichern) → Slot ungültig (Save-Index-Mismatch) → Fallback auf Slot 1 (Index 200). |
| `slot-older-damaged` | Älterer Slot 1 beschädigt, neuerer Slot 0 intakt: Slot 0 aktiv, checksumsOk=false (weil ein Slot ungültig), Slot-1-Problem gemeldet. |
| `slot1-active` | Beide Slots gültig, Slot 1 hat den höheren Save-Index (1404 > 1403, wie im echten Save, aber Rollen vertauscht) und den neueren Stand (2 Mons) → activeSlot=1. Prüft zugleich die Sektor-Rotation (physische Reihenfolge der Sektor-IDs hängt vom Index ab). |
| `slots-both-damaged` | Beide Slots beschädigt (Prüfsummenfeld bzw. Datenbyte) → Parser muss mit Fehler „kein gültiger Slot" abbrechen. |
| `slots-equal-index` | Beide Slots gültig mit identischem Inhalt und gleichem Save-Index (Normalfall tritt im echten Spiel nicht auf): Parser-Konvention = Slot 0 (kein Wissen über das Spielverhalten). |
| `text-charmap` | Gen-3-Textkodierung: Spitznamen mit voller Länge 10 (ohne Terminator), 7-Zeichen-OT und -Trainername ohne Terminator, leerer Spitzname, Leerzeichen am Ende/Anfang/Mitte, Ziffern, Groß/Klein, Satzzeichen und Umlaute. Basiszeichensatz (Leerzeichen, 0–9, A–Z, a–z) ist [V]; Satzzeichen/Umlaute (!?.-…,/:ÄÖÜäöüéÉß♂♀) stammen aus der Parser-Tabelle ACCENTS und sind [G]. |
| `unknown-species` | Species-IDs außerhalb der ROM-Tabelle (1294, 2000, 0xFFFF; Team und Box): nat=null, Warnung „nicht in Tabelle", Box-Level unbekannt (levelSource unknown, level null), Team-Level bleibt stored. Dazu Platzhalter-IDs der Tabelle (252, 276: nat 0) und Species 0 mit PID≠0 – hier wird der AKTUELLE Parser-Zustand festgeschrieben (keine Warnung; nat null) – sowie ein Box-Mon ohne hasSpecies-Bit (Warnung). |
| `wild-routes` | Wildfänge auf 29 verschiedenen Fundorten (Routen 2–18, Höhlen/Wälder, Städte, Safari Zone mit Safari Ball). Spezies sind frei gewählt (nicht encounter-genau); geprüft wird der Fundort → Route-ID-Mapping aus data/mapsec-to-route.json. Ein Mon im Team, Rest in Box 1–1. |
| `diff-a` / `diff-b` / `diff-a-to-b.expected.json` | Save-Paar für „neu seit letztem Import": Stand A → Stand B (B in Slot 1 gespeichert, Slot 0 hält noch A). Erwartet: 7 neue Mons (inkl. Tausch, Schlupf, zweites Rattata auf Route 2), 1 freigelassen (Slot neu belegt → added+removed, nicht changed), 1 Box→Team verschoben, 1 Entwicklung, 1 Level-Up; Identität = PID+OTID. |

## Verifiziert vs. Annahme
**Aus dem echten Save abgeleitet ([V], siehe SPEC.md/RESULTS.md):** Sektor-Footer (ID @0xFF4, Prüfsumme @0xFF6, Signatur 0x01121999 @0xFF8, Index @0xFFC), Prüfsummenlängen (0xF24/0xD98/0x450/sonst 0xFF0), 2 Slots × 14 Sektoren inkl. Rotation, Box-/Party-Layout, 58-Byte-Box-Mons, Fundort-Mapsec/Fang-Level-Bits, Safari-Ball=4, Spezies-Tabelle des ROMs.

**Unbelegte Annahmen, auf die der Generator baut (`ASSUMPTION [G]` im Code):**
- Party-Ball @0x2A (nur 2 echte Samples), Ei-Flags (IV-Bit 30 / Party-Flagbit 2), Hidden-Ability = IV-Wort Bit 31
- Ball-Enum-Namen außer Safari (Cherish=15 u. a.), Fundort-Sonderwerte 253/254/255 (Vanilla-Konstanten)
- Hall-of-Fame-Layout, Boxnamen-Zuordnung, Flashcart-Header-Inhalt, Satzzeichen-/Akzent-Bytewerte
- Sektoren 28–31 außerhalb der genutzten Bereiche mit 0 gefüllt; reales Verhalten des Spiels bei falscher Signatur / Gleichstand beim Save-Index unbekannt
- Shiny-Schwelle (Parser: xor<16) ist unbelegt; getestet wird der Rohwert `shinyXor`.
- Fälle `unknown-species` (Platzhalter-IDs, Species 0) halten nur das Ist-Verhalten des Parsers fest.
Pro Fixture steht die Liste im Feld `unverifiedAssumptions` des Expected-JSON. Wo ein Test nur Encoder/Decoder-Konsistenz prüft (z. B. Sonderzeichen), sagt das die Beschreibung.

## Grenzen
- Save-Index-Überlauf (u32-Wraparound) wird vom Parser nicht behandelt und hier nicht getestet (praktisch irrelevant).
- Bei beschädigtem Slot sind die gemeinsam genutzten Sektoren 30/31 (Boxen 20–22) mehrdeutig; die Fallback-Fixtures halten diese Boxen in beiden Slots identisch.
