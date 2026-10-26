/**
 * What changed between two parsed saves. Identity is personality plus OT id,
 * so an evolution, a level-up, or a move between box and party stays the same Pokémon.
 * A release plus a new catch in that slot is added and removed, never changed.
 */
import type { Mon, ParsedSave } from './unbound-save'

export interface MonLoc {
  where: 'party' | 'box'
  box?: number
  slot: number
}

export interface DiffAdded extends MonLoc {
  identity: string
  speciesId: number
  nat: number | null
  nickname: string
  level: number | null
  metLocation: number
  category: string
}

export interface DiffRemoved extends MonLoc {
  identity: string
  speciesId: number
  nat: number | null
  nickname: string
}

export interface DiffMoved {
  identity: string
  speciesId: number
  from: MonLoc
  to: MonLoc
}

export interface DiffChanged {
  identity: string
  nickname: string
  changes: { speciesId?: [number, number]; level?: [number | null, number | null] }
}

export interface SaveDiff {
  added: DiffAdded[]
  removed: DiffRemoved[]
  moved: DiffMoved[]
  changed: DiffChanged[]
  unchangedCount: number
  dex: { newlySeenNat: number[]; newlyCaughtNat: number[] }
}

export function identityOf(mon: Pick<Mon, 'personality' | 'sid' | 'tid'>): string {
  const otid = ((mon.sid << 16) | mon.tid) >>> 0
  return `${mon.personality.toString(16).padStart(8, '0')}:${otid.toString(16).padStart(8, '0')}`
}

function loc(mon: Mon): MonLoc {
  return { where: mon.where, ...(mon.box !== undefined ? { box: mon.box } : {}), slot: mon.slot }
}

function locKey(mon: Mon): string {
  return `${mon.where}:${mon.box ?? ''}:${mon.slot}`
}

function order(a: Mon, b: Mon): number {
  return (a.where === b.where ? 0 : a.where === 'party' ? -1 : 1) || (a.box ?? 0) - (b.box ?? 0) || a.slot - b.slot
}

export function allMons(save: ParsedSave): Mon[] {
  return [...save.party, ...save.boxes.flatMap((box) => box.mons)]
}

export function diffSaves(before: ParsedSave, after: ParsedSave): SaveDiff {
  const older = allMons(before).sort(order)
  const newer = allMons(after).sort(order)
  const groups = new Map<string, Mon[]>()
  for (const mon of older) {
    const key = identityOf(mon)
    const list = groups.get(key) ?? []
    list.push(mon)
    groups.set(key, list)
  }
  const pairs: [Mon | null, Mon][] = []
  const used = new Set<Mon>()
  const pending: Mon[] = []
  for (const mon of newer) {
    const samePlace = groups.get(identityOf(mon))?.find((item) => !used.has(item) && locKey(item) === locKey(mon))
    if (samePlace) {
      used.add(samePlace)
      pairs.push([samePlace, mon])
    } else pending.push(mon)
  }
  for (const mon of pending) {
    const any = groups.get(identityOf(mon))?.find((item) => !used.has(item))
    if (any) used.add(any)
    pairs.push([any ?? null, mon])
  }
  pairs.sort((left, right) => order(left[1], right[1]))
  const added: DiffAdded[] = []
  const moved: DiffMoved[] = []
  const changed: DiffChanged[] = []
  let unchangedCount = 0
  for (const [from, to] of pairs) {
    if (!from) {
      added.push({
        identity: identityOf(to),
        ...loc(to),
        speciesId: to.speciesId,
        nat: to.nat,
        nickname: to.nickname,
        level: to.level,
        metLocation: to.met.mapSectionId,
        category: to.met.category,
      })
      continue
    }
    const didMove = locKey(from) !== locKey(to)
    if (didMove) moved.push({ identity: identityOf(to), speciesId: to.speciesId, from: loc(from), to: loc(to) })
    const changes: DiffChanged['changes'] = {}
    if (from.speciesId !== to.speciesId) changes.speciesId = [from.speciesId, to.speciesId]
    if (from.level !== to.level) changes.level = [from.level, to.level]
    if (Object.keys(changes).length) changed.push({ identity: identityOf(to), nickname: to.nickname, changes })
    if (!didMove && !Object.keys(changes).length) unchangedCount += 1
  }
  const removed: DiffRemoved[] = older.filter((mon) => !used.has(mon)).map((mon) => ({
    identity: identityOf(mon),
    ...loc(mon),
    speciesId: mon.speciesId,
    nat: mon.nat,
    nickname: mon.nickname,
  }))
  const seen = new Set(before.dex.seenNat)
  const caught = new Set(before.dex.caughtNat)
  return {
    added,
    removed,
    moved,
    changed,
    unchangedCount,
    dex: {
      newlySeenNat: after.dex.seenNat.filter((nat) => !seen.has(nat)),
      newlyCaughtNat: after.dex.caughtNat.filter((nat) => !caught.has(nat)),
    },
  }
}
