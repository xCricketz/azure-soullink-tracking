/**
 * Pokémon Unbound v2.1.1.1 (CFRU) – Referenz-Parser für .sav (clean-room, eigene Implementierung).
 * Format-Fakten: siehe ../SPEC.md. Keine ROM-/Save-Daten in diesem Repo.
 * Läuft mit bun (TypeScript direkt): `bun run src/cli.ts <save.sav>`
 */

// ---------- Konstanten (SPEC.md §2) ----------
export const SAVE_SIZE = 0x20000;
export const SLOT_SIZE = 0xe000; // 14 Sektoren à 0x1000
export const SECTOR_SIZE = 0x1000;
export const SECTOR_DATA = 0xff0; // Nutzdaten je Sektor
export const OFF_SECTOR_ID = 0xff4; // u16
export const OFF_CHECKSUM = 0xff6; // u16
export const OFF_SIGNATURE = 0xff8; // u32
export const OFF_SAVE_INDEX = 0xffc; // u32
export const SIGNATURE_UNBOUND = 0x01121999;
/** Länge der Checksummen-Berechnung je Sektor-ID (Rest: 0xFF0). */
export const CHECKSUM_LEN: Record<number, number> = { 0: 0xf24, 4: 0xd98, 13: 0x450 };

export const MON_STRIDE_BOX = 58; // CFRU "CompressedPokemon"
export const MON_STRIDE_PARTY = 100;
export const MONS_PER_BOX = 30;
export const BOX_COUNT = 25;
export const PARTY_COUNT_OFF = 0x34; // in Sektor 1
export const PARTY_OFF = 0x38; // in Sektor 1
export const DEX_SEEN_OFF = 0x310; // Sektor 1, 125 Byte, Bit i = National-Dex-Nr. i+1
export const DEX_CAUGHT_OFF = 0x38d; // Sektor 1, 125 Byte
export const DEX_BYTES = 125;
export const BOX_NAMES_END = 0x442; // Sektor 13
export const BOX_NAME_LEN = 9;

export const NATURES = [
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
  'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
  'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
] as const;

export const GROWTH = ['MEDIUM_FAST', 'ERRATIC', 'FLUCTUATING', 'MEDIUM_SLOW', 'FAST', 'SLOW'] as const;

// ---------- Hilfsfunktionen ----------
const ACCENTS: Record<number, string> = {
  0x01: 'À', 0x02: 'Á', 0x03: 'Â', 0x04: 'Ç', 0x05: 'È', 0x06: 'É', 0x07: 'Ê', 0x08: 'Ë', 0x09: 'Ì', 0x0b: 'Î',
  0x0c: 'Ï', 0x0d: 'Ò', 0x0e: 'Ó', 0x0f: 'Ô', 0x10: 'Œ', 0x11: 'Ù', 0x12: 'Ú', 0x13: 'Û', 0x14: 'Ñ', 0x15: 'ß',
  0x16: 'à', 0x17: 'á', 0x19: 'ç', 0x1a: 'è', 0x1b: 'é', 0x1c: 'ê', 0x1d: 'ë', 0x1e: 'ì', 0x20: 'î', 0x21: 'ï',
  0x22: 'ò', 0x23: 'ó', 0x24: 'ô', 0x25: 'œ', 0x26: 'ù', 0x27: 'ú', 0x28: 'û', 0x29: 'ñ', 0x2a: 'º', 0x2b: 'ª',
  0xab: '!', 0xac: '?', 0xad: '.', 0xae: '-', 0xaf: '·', 0xb0: '…', 0xb1: '“', 0xb2: '”', 0xb3: '‘', 0xb4: '’',
  0xb5: '♂', 0xb6: '♀', 0xb7: '$', 0xb8: ',', 0xb9: '×', 0xba: '/', 0xef: '▶', 0xf0: ':', 0xf1: 'Ä', 0xf2: 'Ö',
  0xf3: 'Ü', 0xf4: 'ä', 0xf5: 'ö', 0xf6: 'ü',
};

/** Gen-3-Zeichensatz (westlich) → String; stoppt bei 0xFF. Unbekannte Bytes → '?'. */
export function decodeText(bytes: Uint8Array): string {
  let s = '';
  for (const c of bytes) {
    if (c === 0xff) break;
    if (c === 0x00) s += ' ';
    else if (c >= 0xa1 && c <= 0xaa) s += String(c - 0xa1);
    else if (c >= 0xbb && c <= 0xd4) s += String.fromCharCode(65 + c - 0xbb);
    else if (c >= 0xd5 && c <= 0xee) s += String.fromCharCode(97 + c - 0xd5);
    else s += ACCENTS[c] ?? '?';
  }
  return s;
}

/** Sektor-Checksumme: Summe der u32-LE-Wörter über `len` Bytes, dann (hi16 + lo16) & 0xFFFF. */
export function sectorChecksum(data: Uint8Array, len: number): number {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let sum = 0;
  for (let i = 0; i + 4 <= len; i += 4) sum = (sum + dv.getUint32(i, true)) >>> 0;
  return ((sum >>> 16) + (sum & 0xffff)) & 0xffff;
}

export function natureOf(personality: number): string {
  return NATURES[(personality >>> 0) % 25];
}

/** Erfahrungspunkte, die für Level n (1..100) nötig sind (Gen-3-Formeln; Ganzzahl-Division wie im Spiel). */
export function expForLevel(growth: number, n: number): number {
  const n3 = n * n * n;
  const fl = Math.floor;
  switch (growth) {
    case 0: return n3;
    case 1: // ERRATIC
      if (n <= 50) return fl((n3 * (100 - n)) / 50);
      if (n <= 68) return fl((n3 * (150 - n)) / 100);
      if (n <= 98) return fl((n3 * fl((1911 - 10 * n) / 3)) / 500);
      return fl((n3 * (160 - n)) / 100);
    case 2: // FLUCTUATING
      if (n <= 15) return fl((n3 * (fl((n + 1) / 3) + 24)) / 50);
      if (n <= 35) return fl((n3 * (n + 14)) / 50);
      return fl((n3 * (fl(n / 2) + 32)) / 50);
    case 3: return fl((6 * n3) / 5) - 15 * n * n + 100 * n - 140;
    case 4: return fl((4 * n3) / 5);
    case 5: return fl((5 * n3) / 4);
    default: return NaN;
  }
}

export function levelFromExp(growth: number, exp: number): number {
  let lv = 1;
  for (let n = 2; n <= 100; n++) if (expForLevel(growth, n) <= exp) lv = n; else break;
  return lv;
}

// ---------- Typen ----------
export interface SpeciesRow { id: number; nat: number; growth: number; types: number[] }
export interface SpeciesTable { numSpecies: number; species: SpeciesRow[] }

export interface Mon {
  where: 'party' | 'box';
  box?: number; // 0-basiert
  slot: number; // 0-basiert
  personality: number;
  tid: number;
  sid: number;
  speciesId: number; // interne Unbound-Species-ID (1..1293)
  nat: number | null; // National-Dex-Nr. (aus ROM-Tabelle) oder null, falls unbekannt
  /** Reihenfolge unter allen internen IDs mit gleicher National-Nr. (0 = erste/Basisform) */
  formIndex: number | null;
  name: string | null; // aus dex.json (Basisname je National-Nr.), falls übergeben
  nickname: string;
  isEgg: boolean;
  ot: string;
  level: number | null;
  levelSource: 'stored' | 'exp-derived' | 'unknown';
  exp: number;
  nature: string;
  item: number;
  moves: number[];
  ivs: number[]; // hp, atk, def, spe, spa, spd
  evs: number[]; // hp, atk, def, spe, spa, spd (Reihenfolge wie im Spiel)
  hiddenAbility: boolean;
  /** PID/TID/SID-Xor (Gen-3-Formel). Shiny nach Vanilla = xor < 8; Unbound scheint < 16 zu nutzen (VERMUTUNG, Histogramm) */
  shinyXor: number;
  shiny: boolean; // GERATEN: shinyXor < 16
  ownOT: boolean; // OT-ID == Trainer-ID des Spielers
  warnings: string[];
}

export interface SlotInfo {
  slot: 0 | 1;
  valid: boolean;
  saveIndex: number;
  signature: number;
  problems: string[];
  sectors: Record<number, Uint8Array>; // Sektor-ID -> 0xFF0 Nutzdaten
}

export interface ParsedSave {
  fileSize: number;
  activeSlot: 0 | 1;
  slots: { slot: number; valid: boolean; saveIndex: number; problems: string[] }[];
  checksumsOk: boolean;
  trainer: { name: string; tid: number; sid: number; playtime: { hours: number; minutes: number; seconds: number; frames: number } };
  party: Mon[];
  boxes: { index: number; name: string; mons: Mon[] }[];
  currentBox: number;
  dex: { seenNat: number[]; caughtNat: number[]; seenCount: number; caughtCount: number };
  ownedSpeciesNat: number[]; // distinkte National-Nrn. in Team+Boxen
  progress: { badgeFlagsSet: number; badges: boolean[]; gameClearFlag: boolean; hallOfFameEntries: number };
  warnings: string[];
}

// ---------- Slots / Sektoren ----------
function u16(b: Uint8Array, o: number) { return b[o] | (b[o + 1] << 8); }
function u32(b: Uint8Array, o: number) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

export function readSlot(buf: Uint8Array, slot: 0 | 1): SlotInfo {
  const base = slot * SLOT_SIZE;
  const problems: string[] = [];
  const sectors: Record<number, Uint8Array> = {};
  let sig = 0, idx = 0;
  for (let s = 0; s < 14; s++) {
    const sec = buf.subarray(base + s * SECTOR_SIZE, base + (s + 1) * SECTOR_SIZE);
    const id = u16(sec, OFF_SECTOR_ID);
    const chk = u16(sec, OFF_CHECKSUM);
    const sg = u32(sec, OFF_SIGNATURE);
    const ix = u32(sec, OFF_SAVE_INDEX);
    if (s === 0) { sig = sg; idx = ix; }
    if (sg !== sig) problems.push(`Sektor@${s}: Signatur ${sg.toString(16)} != ${sig.toString(16)}`);
    if (ix !== idx) problems.push(`Sektor@${s}: Save-Index ${ix} != ${idx}`);
    if (id > 13) { problems.push(`Sektor@${s}: ungültige ID ${id}`); continue; }
    if (sectors[id]) problems.push(`Sektor-ID ${id} doppelt`);
    const calc = sectorChecksum(sec, CHECKSUM_LEN[id] ?? SECTOR_DATA);
    if (calc !== chk) problems.push(`Sektor-ID ${id}: Checksumme ${chk.toString(16)} != berechnet ${calc.toString(16)}`);
    sectors[id] = sec.subarray(0, SECTOR_DATA);
  }
  for (let id = 0; id < 14; id++) if (!sectors[id]) problems.push(`Sektor-ID ${id} fehlt`);
  if (sig === 0xffffffff && idx === 0xffffffff) problems.push('Slot leer');
  return { slot, valid: problems.length === 0, saveIndex: idx, signature: sig, problems, sectors };
}

/** Aktiver Slot = gültiger Slot mit höherem Save-Index (32-Bit-Wraparound wie im Spiel nicht behandelt). */
export function pickActiveSlot(a: SlotInfo, b: SlotInfo): SlotInfo {
  if (a.valid && !b.valid) return a;
  if (b.valid && !a.valid) return b;
  return b.saveIndex > a.saveIndex ? b : a;
}

// ---------- Mon-Decoder ----------
export interface DecodeCtx {
  table?: SpeciesTable;
  names?: Map<number, string>;
  tid: number; sid: number;
  formIndexOf?: (id: number) => number | null;
}

function ivsFrom(word: number): { ivs: number[]; egg: boolean; ha: boolean } {
  const ivs: number[] = [];
  for (let i = 0; i < 6; i++) ivs.push((word >>> (5 * i)) & 31);
  return { ivs, egg: ((word >>> 30) & 1) === 1, ha: ((word >>> 31) & 1) === 1 };
}

function finish(m: Partial<Mon>, ctx: DecodeCtx, ownerWarn: string[]): Mon {
  const mon = m as Mon;
  const row = ctx.table?.species[mon.speciesId];
  mon.nat = row && row.nat ? row.nat : null;
  mon.formIndex = ctx.formIndexOf ? ctx.formIndexOf(mon.speciesId) : null;
  mon.name = mon.nat && ctx.names ? ctx.names.get(mon.nat) ?? null : null;
  mon.nature = natureOf(mon.personality);
  const x = (mon.tid ^ mon.sid ^ (mon.personality >>> 16) ^ (mon.personality & 0xffff)) >>> 0;
  mon.shinyXor = x;
  mon.shiny = x < 16;
  mon.ownOT = mon.tid === ctx.tid && mon.sid === ctx.sid;
  mon.warnings = ownerWarn;
  if (!row) mon.warnings.push(`Species-ID ${mon.speciesId} nicht in Tabelle`);
  return mon;
}

/** Komprimierter Box-Mon (58 Byte, CFRU). Gibt null für leeren Slot zurück. */
export function decodeBoxMon(r: Uint8Array, box: number, slot: number, ctx: DecodeCtx): Mon | null {
  const species = u16(r, 28);
  const pid = u32(r, 0);
  if (species === 0 && pid === 0) return null;
  const w: string[] = [];
  const sanity = r[19];
  if (species !== 0 && (sanity & 2) === 0) w.push('Sanity-Bit hasSpecies nicht gesetzt');
  const movesPacked = r.subarray(39, 44); // 40 Bit = 4 x 10 Bit
  let packed = 0n;
  for (let i = 4; i >= 0; i--) packed = (packed << 8n) | BigInt(movesPacked[i]);
  const moves = [0, 1, 2, 3].map((i) => Number((packed >> BigInt(10 * i)) & 0x3ffn));
  const { ivs, egg, ha } = ivsFrom(u32(r, 54));
  const exp = u32(r, 32);
  const row = ctx.table?.species[species];
  let level: number | null = null;
  let levelSource: Mon['levelSource'] = 'unknown';
  if (row && row.growth <= 5) { level = levelFromExp(row.growth, exp); levelSource = 'exp-derived'; }
  const isEgg = egg || (sanity & 4) !== 0;
  const otid = u32(r, 4);
  return finish({
    where: 'box', box, slot, personality: pid, tid: otid & 0xffff, sid: otid >>> 16, speciesId: species,
    nickname: isEgg ? '' : decodeText(r.subarray(8, 18)), isEgg, ot: decodeText(r.subarray(20, 27)),
    level, levelSource, exp, item: u16(r, 30), moves,
    ivs, evs: [r[44], r[45], r[46], r[47], r[48], r[49]], hiddenAbility: ha,
  }, ctx, w);
}

/** Party-Mon: 100 Byte, KEINE Verschlüsselung/Substruct-Shuffle (GAEM-Reihenfolge fest), Level @0x54. */
export function decodePartyMon(r: Uint8Array, slot: number, ctx: DecodeCtx): Mon | null {
  const species = u16(r, 0x20);
  const pid = u32(r, 0);
  if (species === 0 && pid === 0) return null;
  const w: string[] = [];
  const dv = new DataView(r.buffer, r.byteOffset, r.byteLength);
  const { ivs, egg, ha } = ivsFrom(dv.getUint32(0x48, true));
  const isEgg = egg || (r[0x13] & 4) !== 0;
  const otid = u32(r, 4);
  const moves = [0, 1, 2, 3].map((i) => u16(r, 0x2c + 2 * i));
  return finish({
    where: 'party', slot, personality: pid, tid: otid & 0xffff, sid: otid >>> 16, speciesId: species,
    nickname: isEgg ? '' : decodeText(r.subarray(8, 18)), isEgg, ot: decodeText(r.subarray(20, 27)),
    level: r[0x54], levelSource: 'stored', exp: u32(r, 0x24), item: u16(r, 0x22), moves,
    ivs, evs: [r[0x38], r[0x39], r[0x3a], r[0x3b], r[0x3c], r[0x3d]], hiddenAbility: ha,
  }, ctx, w);
}

// ---------- Box-Speicher ----------
/** Setzt den linearen Box-Speicher (25 × 30 × 58 Byte) aus den Sektoren zusammen (SPEC.md §4). */
export function assembleBoxMemory(sectors: Record<number, Uint8Array>, buf: Uint8Array): Uint8Array {
  const per = MONS_PER_BOX * MON_STRIDE_BOX; // 1740
  const parts: Uint8Array[] = [sectors[5].subarray(4)];
  for (let id = 6; id <= 13; id++) parts.push(sectors[id]);
  let vanilla = concat(parts).subarray(0, 19 * per);
  const sec30 = buf.subarray(30 * SECTOR_SIZE, 31 * SECTOR_SIZE);
  const sec31 = buf.subarray(31 * SECTOR_SIZE, 32 * SECTOR_SIZE);
  return concat([
    vanilla,
    sec30.subarray(0xb0c, SECTOR_DATA), sec31.subarray(0, 0xf80), // Boxen 20-22
    sectors[2].subarray(0xf18, SECTOR_DATA), sectors[3].subarray(0, 0xcc0), // Boxen 23-24
    sectors[0].subarray(0xb0, 0xb0 + per), // Box 25
  ]);
}

function concat(a: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of a) { out.set(x, o); o += x.length; }
  return out;
}

/** Box-Titel (SPEC.md §4.3): 25 Namen à 9 Byte enden bei Sektor13+0x442, Rohreihenfolge ist verdreht. */
export function readBoxNames(s13: Uint8Array): string[] {
  const raw: string[] = [];
  const start = BOX_NAMES_END - BOX_NAME_LEN * BOX_COUNT;
  for (let i = 0; i < BOX_COUNT; i++) raw.push(decodeText(s13.subarray(start + i * BOX_NAME_LEN, start + (i + 1) * BOX_NAME_LEN)));
  // Spiel-Reihenfolge: Box1..Box14 = raw[11..24], Box15..Box24 = raw[10..1], Box25 = raw[0]
  return [...raw.slice(11), ...raw.slice(1, 11).reverse(), raw[0]];
}

export function bitIndices(b: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < b.length * 8; i++) if ((b[i >> 3] >> (i & 7)) & 1) out.push(i);
  return out;
}

/** Vanilla-Flags 0x000..0x8FF: Sektor1[0xEE0..0xFF0) ++ Sektor2[0..0x10). */
export function readVanillaFlag(sectors: Record<number, Uint8Array>, flag: number): boolean {
  const f = concat([sectors[1].subarray(0xee0, SECTOR_DATA), sectors[2].subarray(0, 0x10)]);
  return ((f[flag >> 3] >> (flag & 7)) & 1) === 1;
}

export interface ParseOptions {
  table?: SpeciesTable; // data/species-table.json
  dexNames?: { nat: number; name: string; form: string | null }[]; // dex.json (optional)
}

export function parseSave(buf: Uint8Array, opts: ParseOptions = {}): ParsedSave {
  const warnings: string[] = [];
  if (buf.length !== SAVE_SIZE && buf.length !== SAVE_SIZE + 16) throw new Error(`unerwartete Dateigröße ${buf.length}`);
  const off = buf.length - SAVE_SIZE; // Flashcart-Header (16 Byte) falls vorhanden
  if (off) buf = buf.subarray(off);
  const a = readSlot(buf, 0), b = readSlot(buf, 1);
  const act = pickActiveSlot(a, b);
  if (!act.valid) throw new Error('kein gültiger Slot: ' + act.problems.slice(0, 3).join('; '));
  if (act.signature !== SIGNATURE_UNBOUND) warnings.push(`Signatur ${act.signature.toString(16)} != Unbound 0x01121999 (Layout evtl. anders!)`);
  const S = act.sectors;

  const names = new Map<number, string>();
  for (const r of opts.dexNames ?? []) if (r.form == null) names.set(r.nat, r.name);
  const firstIdOfNat = new Map<number, number[]>();
  opts.table?.species.forEach((r) => { if (r.id > 0 && r.nat) { const l = firstIdOfNat.get(r.nat) ?? []; l.push(r.id); firstIdOfNat.set(r.nat, l); } });
  const formIndexOf = opts.table ? (id: number) => { const r = opts.table!.species[id]; return r && r.nat ? (firstIdOfNat.get(r.nat) ?? []).indexOf(id) : null; } : undefined;

  const s0 = S[0];
  const tid = u16(s0, 0xa), sid = u16(s0, 0xc);
  const trainer = {
    name: decodeText(s0.subarray(0, 7)), tid, sid,
    playtime: { hours: u16(s0, 0xe), minutes: s0[0x10], seconds: s0[0x11], frames: s0[0x12] },
  };
  const ctx: DecodeCtx = { table: opts.table, names, tid, sid, formIndexOf };

  const partyCount = u32(S[1], PARTY_COUNT_OFF);
  const party: Mon[] = [];
  if (partyCount > 6) warnings.push(`Party-Zähler ${partyCount} > 6`);
  for (let i = 0; i < Math.min(partyCount, 6); i++) {
    const o = PARTY_OFF + i * MON_STRIDE_PARTY;
    const m = decodePartyMon(S[1].subarray(o, o + MON_STRIDE_PARTY), i, ctx);
    if (m) party.push(m);
  }

  const mem = assembleBoxMemory(S, buf);
  const titles = readBoxNames(S[13]);
  const boxes: ParsedSave['boxes'] = [];
  for (let bx = 0; bx < BOX_COUNT; bx++) {
    const mons: Mon[] = [];
    for (let sl = 0; sl < MONS_PER_BOX; sl++) {
      const o = (bx * MONS_PER_BOX + sl) * MON_STRIDE_BOX;
      const m = decodeBoxMon(mem.subarray(o, o + MON_STRIDE_BOX), bx, sl, ctx);
      if (m) mons.push(m);
    }
    boxes.push({ index: bx, name: titles[bx], mons });
  }
  const currentBox = u32(S[5], 0);

  const seenNat = bitIndices(S[1].subarray(DEX_SEEN_OFF, DEX_SEEN_OFF + DEX_BYTES)).map((i) => i + 1);
  const caughtNat = bitIndices(S[1].subarray(DEX_CAUGHT_OFF, DEX_CAUGHT_OFF + DEX_BYTES)).map((i) => i + 1);

  const owned = new Set<number>();
  for (const m of [...party, ...boxes.flatMap((x) => x.mons)]) if (m.nat && !m.isEgg) owned.add(m.nat);
  const cs = new Set(caughtNat);
  for (const n of owned) if (!cs.has(n)) warnings.push(`National-Nr. ${n} in Team/Box, aber nicht im Caught-Flag`);

  const badges = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => readVanillaFlag(S, 0x820 + i));
  const hof = countHallOfFame(buf, tid, sid);

  return {
    fileSize: buf.length + off, activeSlot: act.slot,
    slots: [a, b].map((s) => ({ slot: s.slot, valid: s.valid, saveIndex: s.saveIndex, problems: s.problems })),
    checksumsOk: a.valid && b.valid, trainer, party, boxes, currentBox,
    dex: { seenNat, caughtNat, seenCount: seenNat.length, caughtCount: caughtNat.length },
    ownedSpeciesNat: [...owned].sort((x, y) => x - y),
    progress: { badgeFlagsSet: badges.filter(Boolean).length, badges, gameClearFlag: readVanillaFlag(S, 0x82c), hallOfFameEntries: hof },
    warnings,
  };
}

/** Hall-of-Fame: Sektoren 28/29 (0x1C000..0x1E000), 24-Byte-Einträge {tid:u16,sid:u16,pid:u32,species:u16,level:u8,nick[10],…}.
 *  Gezählt werden Einträge mit Species != 0 und OT-ID == Spieler (SPEC.md §7, teilweise geraten). */
export function countHallOfFame(buf: Uint8Array, tid: number, sid: number): number {
  let n = 0;
  for (let o = 0x1c000; o + 24 <= 0x1e000; o += 24) {
    const e = buf.subarray(o, o + 24);
    if (u16(e, 0) === tid && u16(e, 2) === sid && u16(e, 8) !== 0 && u16(e, 8) < 1294) n++;
  }
  return n;
}
