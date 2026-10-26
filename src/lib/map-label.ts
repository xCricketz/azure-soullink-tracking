/**
 * Town and route labels stay about 13px on the map.
 * Screen size is that map size times the zoom, clamped to 9–14px
 * so a zoomed-in map does not keep full-size text over every neighbor.
 */
export function labelScreenPx(scale: number, mapPx = 13): number {
  if (!(scale > 0)) return 9
  return Math.min(14, Math.max(9, mapPx * scale))
}

export function labelWorldSize(scale: number, mapPx = 13): number {
  return labelScreenPx(scale, mapPx) / scale
}
