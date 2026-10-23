import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const source = readFileSync(new URL('../public/app-icon.svg', import.meta.url), 'utf8')
const anyIcon = source.replace('rx="112"', 'rx="0"')

const maskable = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-64 -64 640 640">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#22305A"/><stop offset="1" stop-color="#0E1424"/></radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect x="-64" y="-64" width="640" height="640" fill="url(#bg)"/>
  ${source
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<defs>[\s\S]*?<\/defs>/, '')
    .replace(/<rect width="512" height="512"[^/]*\/>/, '')}
</svg>`

function png(svg, size, file) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  const out = new URL(`../public/${file}`, import.meta.url)
  writeFileSync(out, resvg.render().asPng())
  console.log('wrote', file, size)
}

png(anyIcon, 192, 'icon-192.png')
png(anyIcon, 512, 'icon-512.png')
png(anyIcon, 180, 'apple-touch-icon.png')
png(anyIcon, 32, 'favicon.png')
png(maskable, 192, 'icon-maskable-192.png')
png(maskable, 512, 'icon-maskable-512.png')
