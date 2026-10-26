/**
 * Marker, pin, and Here sizes are screen pixels that grow gently with zoom.
 * The map itself grows much faster, so a zoomed-out view stays readable.
 * World units are screen px divided by the current scale.
 */

export interface MarkerPoint {
  key: string
  x: number
  y: number
  kind: string
}

const KIND_SCALE: Record<string, number> = {
  town: 1,
  gym: 0.85,
  dungeon: 0.78,
  cave: 0.74,
  route: 0.64,
  other: 0.74,
}

const KIND_RANK: Record<string, number> = {
  town: 5,
  gym: 4,
  dungeon: 3,
  cave: 2,
  route: 1,
  other: 2,
}

export const MARKER_MIN_PX = 11
export const MARKER_MAX_PX = 34
export const MARKER_FLOOR_PX = 10
export const PIN_MIN_SCALE = 0.45
const GAP_PX = 2

/** Base diameter before the kind factor. 0.3 → 11px, 2.5 → 34px. */
export function markerBaseScreenPx(scale: number): number {
  if (!(scale > 0)) return MARKER_MIN_PX
  const grown = MARKER_MIN_PX + Math.max(0, scale - 0.3) * 16
  return Math.min(MARKER_MAX_PX, Math.max(MARKER_MIN_PX, grown))
}

/** Visible diameter. Smaller kinds shrink, but never under 10px. */
export function markerScreenDiameter(scale: number, kind: string): number {
  const factor = KIND_SCALE[kind] ?? 0.74
  const sized = markerBaseScreenPx(scale) * factor
  return Math.max(MARKER_FLOOR_PX, Math.min(MARKER_MAX_PX, sized))
}

export function markerWorldRadius(scale: number, kind: string): number {
  if (!(scale > 0)) return markerScreenDiameter(1, kind) / 2
  return markerScreenDiameter(scale, kind) / 2 / scale
}

export function markerStrokeWorld(scale: number, radius: number): number {
  if (!(scale > 0)) return 1
  return Math.min(1.25 / scale, radius * 0.22)
}

export function markerRank(kind: string, key = '', priority: readonly string[] = []): number {
  const index = priority.indexOf(key)
  const bonus = index >= 0 ? 3 - index : 0
  return (KIND_RANK[kind] ?? 2) + Math.max(0, bonus)
}

/**
 * Drop the less important marker when two visible circles would touch.
 * Towns win. The current place and the next step are kept ahead of caves and routes.
 */
export function visibleMarkerKeys(nodes: MarkerPoint[], scale: number, priority: readonly string[] = []): Set<string> {
  const ranked = [...nodes].sort((a, b) => markerRank(b.kind, b.key, priority) - markerRank(a.kind, a.key, priority) || a.key.localeCompare(b.key))
  const kept: MarkerPoint[] = []
  const keys = new Set<string>()
  const gap = GAP_PX / Math.max(scale, 0.01)
  for (const node of ranked) {
    const radius = markerWorldRadius(scale, node.kind)
    const hits = kept.some((other) => {
      const otherRadius = markerWorldRadius(scale, other.kind)
      return Math.hypot(node.x - other.x, node.y - other.y) < radius + otherRadius + gap
    })
    if (!hits) {
      kept.push(node)
      keys.add(node.key)
    }
  }
  return keys
}

/**
 * Invisible tap radius. Prefer a 32px circle, and stop at the midpoint
 * to the nearest visible neighbor so the tap lands on the marker under the finger.
 */
export function hitWorldRadius(node: MarkerPoint, visible: MarkerPoint[], scale: number): number {
  const core = markerWorldRadius(scale, node.kind)
  if (!(scale > 0)) return core
  let limit = 16 / scale
  for (const other of visible) {
    if (other.key === node.key) continue
    limit = Math.min(limit, Math.hypot(node.x - other.x, node.y - other.y) / 2)
  }
  if (limit <= core) return core
  return Math.min(16 / scale, limit)
}

export function layoutMarkers(nodes: MarkerPoint[], scale: number, priority: readonly string[] = []): {
  visible: Set<string>
  hitRadius: Map<string, number>
} {
  const visible = visibleMarkerKeys(nodes, scale, priority)
  const shown = nodes.filter((node) => visible.has(node.key))
  const hitRadius = new Map<string, number>()
  for (const node of shown) hitRadius.set(node.key, hitWorldRadius(node, shown, scale))
  return { visible, hitRadius }
}

/** Ring diameter of the player pin. The artwork's ring is 30 units across. */
export function pinRingScreenPx(scale: number): number {
  if (!(scale > 0)) return 14
  const grown = 14 + Math.max(0, scale - 0.3) * 8
  return Math.min(28, Math.max(14, grown))
}

export function hereScreenPx(markerDiameter: number): number {
  return Math.min(13, Math.max(8, markerDiameter * 0.42))
}

/**
 * Place the pin artwork so its tail tip sits above the marker and the Here tag.
 * side -1 / 1 splits two pins on the same place. 0 keeps a single pin centered.
 */
export function pinPlacement(
  scale: number,
  markerRadius: number,
  hereWorld: number,
  side: -1 | 0 | 1,
): { x: number; y: number; art: number } {
  const safe = scale > 0 ? scale : 1
  const art = pinRingScreenPx(safe) / 30
  const tail = 20 * art
  const labelLift = hereWorld > 0 ? 2 / safe + hereWorld * 0.9 : 0
  const gap = 2 / safe
  const ring = pinRingScreenPx(safe)
  return {
    x: side * ((ring / 2 + 3) / safe),
    y: -(markerRadius + labelLift + gap + tail),
    art,
  }
}
