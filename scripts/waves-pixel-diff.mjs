/**
 * Acceptance check for the Waves background.
 * Not part of CI: it needs a built preview and a browser with WebGL.
 *
 *   npm run build && npm run preview
 *   node scripts/waves-pixel-diff.mjs
 *
 * Prints the share of pixels that change by more than 8 in any channel
 * between two screenshots taken 1 second apart, on Routes and Team at 390×844.
 * Exits 1 when either tab is under 5%.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const base = process.env.WAVES_URL || 'http://127.0.0.1:4173/azure-soullink-tracking/'
const outDir = process.env.WAVES_OUT || '/opt/cursor/artifacts'
const threshold = 8
const minimum = 5

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensurePreview() {
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(1500) })
    if (res.ok) return null
  } catch {
    /* start one */
  }
  const child = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    stdio: 'ignore',
    detached: false,
  })
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(base, { signal: AbortSignal.timeout(1000) })
      if (res.ok) return child
    } catch {
      await sleep(250)
    }
  }
  child.kill('SIGKILL')
  throw new Error(`preview did not start at ${base}`)
}

async function changedPercent(page, pngA, pngB) {
  return page.evaluate(async ({ a, b, threshold }) => {
    function load(bytes) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          ctx.drawImage(img, 0, 0)
          resolve(ctx.getImageData(0, 0, canvas.width, canvas.height).data)
        }
        img.onerror = () => reject(new Error('screenshot decode failed'))
        img.src = `data:image/png;base64,${bytes}`
      })
    }
    const left = await load(a)
    const right = await load(b)
    const total = left.length / 4
    let changed = 0
    for (let i = 0; i < left.length; i += 4) {
      if (
        Math.abs(left[i] - right[i]) > threshold
        || Math.abs(left[i + 1] - right[i + 1]) > threshold
        || Math.abs(left[i + 2] - right[i + 2]) > threshold
      ) changed += 1
    }
    return { changed, total, percent: (changed / total) * 100 }
  }, { a: pngA.toString('base64'), b: pngB.toString('base64'), threshold })
}

const preview = await ensurePreview()
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
const logs = []
page.on('console', (msg) => {
  const text = msg.text()
  if (text.startsWith('waves:')) logs.push(text)
})
await page.goto(base, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button.demo', { timeout: 15000 })
await page.click('button.demo')
await page.waitForSelector('.dock', { timeout: 15000 })
await page.waitForSelector('.app [data-vanta="waves"] canvas', { timeout: 15000 })

const report = []
for (const tab of ['Routes', 'Team']) {
  await page.locator('.dk', { hasText: tab }).click()
  await sleep(400)
  const first = await page.screenshot({ type: 'png' })
  await sleep(1000)
  const second = await page.screenshot({ type: 'png' })
  const diff = await changedPercent(page, first, second)
  const slug = tab.toLowerCase()
  writeFileSync(`${outDir}/waves-${slug}-a.png`, first)
  writeFileSync(`${outDir}/waves-${slug}-b.png`, second)
  report.push({ tab, ...diff, pass: diff.percent >= minimum })
  console.log(`${tab}: ${diff.percent.toFixed(2)}% of pixels changed by more than ${threshold} (${diff.changed}/${diff.total})`)
}
console.log('waves logs:', logs.join(' | ') || '(none)')
await browser.close()
preview?.kill('SIGKILL')
const failed = report.filter((row) => !row.pass)
if (failed.length) {
  console.error(`Need at least ${minimum}% on every tab.`)
  process.exit(1)
}
