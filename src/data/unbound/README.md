# Pokémon Unbound v2.1.1.1 – Soullink/Nuzlocke data

This file is the app’s data note (`src/data/unbound`). The ROM and any real save stay out of the repository. Offsets named below are research notes only.

Generated 2026-10-25. All files are plain JSON, UTF-8. Descriptive text was written by hand (own words); only facts (names, numbers, types, levels, item names, area connections) were taken from public sources.

| File | Rows | Content |
|---|---|---|
| dex.json | 974 | `{nat, borrius, name, form, types[], how, gen8}`; 905 national numbers (1-905), 74 form rows, 506 rows with a Borrius number (498 distinct, 1-498 gap-free), 135 gen-8 rows. Some rows carry a `note` (type corrections / Borrius-number provenance). |
| evolutions.json | 92 | Unbound-relevant evolution rules: Link-Stone trade replacements, item-only replacements, regional/Hisuian forms, Legends Arceus evos, 18 level-evolution entries (all 18 verified in the ROM; `source: "rom"`). |
| routes.json | 73 nodes (65 main + 8 optional), 93 edges | Ordered progression areas + neighbour graph. |
| encounters.json | 63 areas (813 wild rows, 173 special/gift rows) | Species per area key and method. No spawn rates. |
| levelcaps.json | 10 steps | Vanilla and Difficult+ caps per badge + Tarmigan Mansion step. |
| guide.json | 55 steps | "Where to go next" in own words with boss/unlock. |

## Sources (and how they were used)
- unboundwiki.com `/pokemon/`, `/locations/`, `/tms-hms/`, walkthrough: **facts only**, text re-written. No licence stated on the site, so no prose or images are copied; credit: Pokémon Unbound Wiki (unboundwiki.com). [primary]
- Pokémon Unbound Wiki on Miraheze (`Level_Cap`): levelcaps. Content is CC BY-NC-SA 4.0 – keep attribution, non-commercial, share-alike if you republish it verbatim; we only re-express numbers.
- PokeAPI CSV (BSD-3): used to verify types and main-series evolution levels.
- Unbound-Cloud `BaseStats.json` (unbound_2_1): verification of types only, nothing stored here.
- domtronn/nuzlocke.data `routes/unbound.txt` (no licence): used **only to cross-check** area order and per-area species, not copied.
- Search snippets of pokecoders.com, fandom wiki, pkmnunbound.com: lower trust, only used for gym order/types and HM locations (flagged in `confidence`).
- The Borrius dex numbers, "how to obtain" texts and encounter lists derive from the wiki's species table (facts), rephrased/abbreviated.

## Verification status (read this first)
Three tiers, from strongest to weakest:
1. **Verified by ROM** (own copy of Unbound v2.1.1.1; details and offsets in `save-import/ROM-FACTS.md`). Only *facts* (numbers) read from the ROM are used here; nothing from the ROM is copied or shipped.
   - evolutions.json: 15 entries patched/confirmed with `"source": "rom"` plus 4 added level evolutions (Magcargo 30, Tyranitar 48, Glalie 30, Mandibuzz 50). Confirmed Unbound changes: Swanna 30, Vanillish 24, Vanilluxe 42, Klang 35, Klinklang 45, Braviary 50, Purugly 34, Mienshao 46, Barbaracle 36. Wiki errors corrected (ROM = main-series value): Boldore 25, Palpitoad 25, Corvisquire 18, Dragonite 55, Gothitelle 41. Galarian Darmanitan evolves with an Ice Stone, not Level 35.
   - dex.json Borrius numbers: table at ROM 0x1A3F398 matches 493 of 495 earlier numbers exactly; fixed Roselia 121, Roserade 122, Cacnea 418, Cacturne 419, Chimecho 376; Stunky/Skuntank have **no** Borrius number (null). Magby 146 and Dustox 432 are now confirmed. Borrius 1-498 is complete with no duplicates (form rows share their base form's number).
2. **Wiki-sourced, not checked against the ROM**: all other evolution rows (Link-Stone/item replacements are *consistent* with the ROM's extra item methods, but not checked one by one), dex `how` texts, types (those were cross-checked with PokeAPI/Unbound-Cloud), HM/gift/trade info, routes and guide text.
3. **Guessed / unverified**: Hisuian Braviary's "holding a Hisui Rock" condition (the ROM has a second Braviary entry, level 50 with a Hisui-variant method, but the item condition is not decoded), boss names/types for gyms 5-8 and some story fights.

**Encounters remain only partially verified.** ROM wild headers (165, at 0xC230D8) were decoded but their map names cannot be resolved for groups >= 43 (64 of 165 headers), so no per-area statement is possible. Cross-check: 11 species appear in ROM headers but not in encounters.json (Fearow, Magikarp, Unown, Larvitar, Cacnea, Absol, Drifblim, Giratina, Yamask, Cofagrigus, Oricorio) and 84 encounters.json species were not found in those headers (other tables such as day/night/swarm/special are suspected). Treat encounters.json as wiki data with hints, not as ROM-verified.

**Level caps are not verifiable in the ROM.** No cap table was found by static search (the caps are probably in code). levelcaps.json stays unconfirmed/unrefuted and is wiki-sourced only.

The old "UNCONFIRMED" markers on the 13 level evolutions have been resolved by the ROM (8 real Unbound changes, 5 wiki errors).

## Verified vs guessed (historical, pre-ROM notes)
- **Verified (two sources):** all dex types after corrections (Blaziken, Deoxys, Gastrodon, Fletchling, Zarude, Aerodactyl had wiki errors; fixed via PokeAPI/Unbound-Cloud); area order (matches nuzlocke.data, apart from deliberate Route 16 placement); encounter species (86 % of nuzlocke.data's species-per-area pairs are also in encounters.json).
- **Single source (wiki):** evolution methods, gifts/trades, HM locations (HM table is wiki + pokecoders).
- **Inferred / guessed (pre-ROM; now ROM-confirmed):** Borrius numbers for Magby (146) and Dustox (432) (the wiki table duplicated 147/422). Borrius numbers 122, 418, 419 were missing in the source table (now filled from the ROM). Boss names/types for gyms 5-8 and several story fights are medium confidence. 13 level-evolution values differ from the main series (Boldore 45, Palpitoad 45, Swanna 30, Vanillish 24, Vanilluxe 42, Klang 35, Klinklang 45, Braviary 50, Corvisquire 16, Dragonite 50, Purugly 34, Gothitelle 45, Mienshao 46; only Barbaracle 36 is confirmed by the v2.1.1 changelog). (Resolved by the ROM, see above.)
- Level caps: Miraheze gives 15/22/29/33/37/51/55/60/66 (vanilla) and 20/26/32/36/40/52/57/61/75 (difficult). Fandom lists the "before gym" caps for gym 5-8 as 45/52/57/61. These agree with the Mansion step (45) + badges 5-7. A third site (pokemonunboundpokedex.com) lists 58/64 for gyms 7/8 – treated as wrong.

## Coverage gaps / known issues
- encounters.json is derived by inverting the species-to-location column; individual area pages were not fetched. Rates, levels, floors and exact weather/time restrictions are missing. Multi-method entries ("surf / good rod") are split. Mission/Thursday-only encounters are not modelled.
- 12 area names from the wiki (Kyurem's Cave, Cave of Being, Fullmoon/Newmoon Island, Distortion World, B5F, etc.) have no route key; they appear in `_meta.coverage.unmapped_area_names`.
- Gym and league nodes: gym towns carry `gym` nodes with no wild encounters; there are 10 area keys without encounter data.
- routes.json has 65 main nodes (not 35-45) because the wiki has ~60 encounter areas; gyms are separate nodes (`kind: gym`, `soullink_route: false`). Merge them into their towns if you prefer ~50. `optional: true` marks side areas. `off_graph_links` holds places not modelled (Battle Frontier, Underground Pass, ...).
- No map coordinates are included; lay the graph out with a force layout.
- The wiki `/locations/` page and Miraheze Gym pages were reachable only partly (bot challenge / 404); no challenge was bypassed.

## Contradictions between sources
- Rock Climb: Route 17 (unboundwiki) vs Route 16 (pkmnunbound.com).
- Gym 5 cap: 43 (vanilla) / 45 (difficult) after the mansion; some pages show 45 as the "gym 5 cap" only.
- Level-evolution values listed above vs main series (resolved by the ROM).
- nuzlocke.data places some areas in a different order (e.g. Route 15, Icy Hole earlier).
