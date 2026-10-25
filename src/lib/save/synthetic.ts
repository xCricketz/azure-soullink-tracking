/**
 * Synthetic Unbound save builder. Shared by the unit tests and the demo
 * "sample save" button. The bytes are invented. No real save is embedded.
 */
import { CHECKSUM_LEN, SECTOR_DATA, SIGNATURE_UNBOUND, sectorChecksum } from './unbound-save'

export type Sectors = Record<number, Uint8Array>

export function encodeGen3(text: string): Uint8Array {
  return Uint8Array.from([...text].map((char) => {
    if (char >= 'A' && char <= 'Z') return 0xbb + char.charCodeAt(0) - 65
    if (char >= 'a' && char <= 'z') return 0xd5 + char.charCodeAt(0) - 97
    return 0xff
  }))
}

export function buildSave(opts: {
  indexA: number
  indexB: number
  mutate?: (sectors: Sectors, slot: number) => void
  extra?: (buf: Uint8Array) => void
}): Uint8Array {
  const buf = new Uint8Array(0x20000)
  for (const slot of [0, 1]) {
    const sectors: Sectors = {}
    for (let id = 0; id < 14; id++) sectors[id] = new Uint8Array(SECTOR_DATA)
    sectors[0].set(encodeGen3('Test'), 0)
    sectors[0].fill(0xff, 4, 8)
    new DataView(sectors[0].buffer).setUint16(0xa, 1234, true)
    new DataView(sectors[0].buffer).setUint16(0xc, 4321, true)
    opts.mutate?.(sectors, slot)
    const index = slot === 0 ? opts.indexA : opts.indexB
    for (let sector = 0; sector < 14; sector++) {
      const id = (sector + 3 * slot) % 14
      const offset = slot * 0xe000 + sector * 0x1000
      buf.set(sectors[id], offset)
      const view = new DataView(buf.buffer, offset, 0x1000)
      view.setUint16(0xff4, id, true)
      view.setUint16(0xff6, sectorChecksum(buf.subarray(offset, offset + 0x1000), CHECKSUM_LEN[id] ?? SECTOR_DATA), true)
      view.setUint32(0xff8, SIGNATURE_UNBOUND, true)
      view.setUint32(0xffc, index, true)
    }
  }
  opts.extra?.(buf)
  return buf
}

export function boxMon(
  sectors: Sectors,
  off: { id: number; o: number } | null,
  buf: Uint8Array | null,
  bufOff: number,
  species: number,
  exp: number,
  pid: number,
  met?: { location?: number; level?: number; otId?: number; ball?: number; originGame?: number },
): void {
  const row = new Uint8Array(58)
  const view = new DataView(row.buffer)
  view.setUint32(0, pid, true)
  view.setUint32(4, met?.otId ?? (1234 | (4321 << 16)), true)
  row.set(encodeGen3('Nick'), 8)
  row.fill(0xff, 12, 18)
  row[19] = 2
  row.set(encodeGen3('Test'), 20)
  row.fill(0xff, 24, 27)
  view.setUint16(28, species, true)
  view.setUint32(32, exp, true)
  view.setUint32(54, 31 | (1 << 5), true)
  if (met) {
    row[0x33] = met.location ?? 0
    const game = met.originGame ?? 4
    view.setUint16(0x34, (met.level ?? 0) & 0x7f | ((game & 0xf) << 7), true)
    row[0x26] = met.ball ?? 3
  }
  const packed = 1n | (2n << 10n) | (3n << 20n) | (4n << 30n)
  for (let i = 0; i < 5; i++) row[39 + i] = Number((packed >> BigInt(8 * i)) & 0xffn)
  if (off) sectors[off.id].set(row, off.o)
  else buf!.set(row, bufOff)
}

function markDex(sector: Uint8Array, nat: number) {
  const bit = nat - 1
  sector[0x310 + (bit >> 3)] |= 1 << (bit & 7)
  sector[0x38d + (bit >> 3)] |= 1 << (bit & 7)
}

/** A tiny invented save for demo mode: Zeraora in the party, Goldeen and Bulbasaur in box 1. */
export function sampleSave(): Uint8Array {
  return buildSave({
    indexA: 2,
    indexB: 1,
    mutate: (sectors) => {
      new DataView(sectors[1].buffer).setUint32(0x34, 1, true)
      const party = new Uint8Array(100)
      const view = new DataView(party.buffer)
      view.setUint32(0, 5174, true)
      view.setUint32(4, 1234 | (4321 << 16), true)
      party.set(encodeGen3('Zeraora'), 8)
      party[15] = 0xff
      view.setUint16(0x20, 1078, true)
      view.setUint32(0x24, 640000, true)
      party[0x2a] = 3
      party[0x45] = 109
      view.setUint16(0x46, 12 | (4 << 7), true)
      party[0x54] = 80
      sectors[1].set(party, 0x38)
      boxMon(sectors, { id: 5, o: 4 }, null, 0, 118, 8000, 3, { location: 101, level: 8 })
      boxMon(sectors, { id: 5, o: 4 + 58 }, null, 0, 1, 1000, 9, { location: 254, level: 50, otId: 9999 })
      markDex(sectors[1], 807)
      markDex(sectors[1], 118)
      markDex(sectors[1], 1)
    },
  })
}
