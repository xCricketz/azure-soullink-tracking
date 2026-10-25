# Fisi's Tracker

Soul-link Nuzlocke tracker for Fisi and Seri. The current run is Pokémon Unbound v2.1.1.1. Installable PWA, English UI, dark by default.

Live: https://xcricketz.github.io/azure-soullink-tracking/

## Local

```bash
npm install
npm run dev
```

The dev server uses the base path `/azure-soullink-tracking/`.

## Before using this build

Apply `supabase/migrations/20261025120000_unbound_run.sql` in the Supabase SQL editor. It archives the finished Azure Platinum run (`active = false`), adds `catches.form` for regional forms, and inserts a fresh active run named `Pokémon Unbound Soul-Link` if none is active. The app does not run that SQL itself. Until it is applied, logging a catch that sends `form` will fail, and the active run stays the old one.

Sign-in is unchanged: pick Fisi or Seri and enter the shared secret code (`fisi@soullink.app` / `seri@soullink.app`). “View demo” is a bundled sample run and does not call Supabase.

## Unbound data

`src/data/unbound/` is the source of truth (dex, evolutions, routes, encounters, level caps, guide, and a precomputed map layout). Text is kept as written. Sprites and ability blurbs still come from PokeAPI main-series data and are not claimed as Unbound stat changes.

Dex order and the Gen 8 post-game toggle default to Borrius order and Gen 8 hidden. The level-cap table defaults to Vanilla and is stored on this phone, not on the shared run.
