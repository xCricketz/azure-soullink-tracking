/**
 * Chromium + Android touch: the Import save controls must open a real file chooser.
 * Run: NODE_PATH=/tmp/e2e/node_modules node e2e/android-import.mjs
 * Serves the built app on 4173 (start `npm run preview` first).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium, devices } from 'playwright'

const base = process.env.APP_URL ?? 'http://127.0.0.1:4173/azure-soullink-tracking/'
const sav = '/tmp/sample-unbound.sav'
const shots = '/opt/cursor/artifacts'

execFileSync('npx', ['tsx', '-e', `
  import { writeFileSync } from 'node:fs'
  import { sampleSave } from './src/lib/save/synthetic.ts'
  writeFileSync('${sav}', sampleSave())
`], { cwd: '/workspace', stdio: 'inherit' })

mkdirSync(shots, { recursive: true })

const pixel = devices['Pixel 5']
const browser = await chromium.launch({ headless: true })
const failures = []

async function enterDemo(page) {
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'View demo' }).click()
  await page.getByText('DEMO', { exact: true }).waitFor()
}

async function expectChooser(page, label) {
  const input = page.getByLabel(label)
  await input.waitFor({ state: 'attached' })
  const box = await input.boundingBox()
  if (!box || box.width < 40 || box.height < 36 || box.y < 0) {
    throw new Error(`${label} hit box is not on screen: ${JSON.stringify(box)}`)
  }
  const pending = page.waitForEvent('filechooser', { timeout: 8000 })
  await input.tap()
  const chooser = await pending
  await chooser.setFiles(sav)
  await page.locator('[data-import="review"]').waitFor({ timeout: 8000 })
  await page.getByText('Zeraora').first().waitFor()
}

try {
  const context = await browser.newContext({
    ...pixel,
    hasTouch: true,
    viewport: { width: 393, height: 851 },
  })
  const page = await context.newPage()
  await enterDemo(page)
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await expectChooser(page, 'Import save')
  await page.screenshot({ path: `${shots}/phone-import-more-review.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await page.getByRole('button', { name: 'Routes', exact: true }).click()
  await page.getByRole('button', { name: 'Log a catch', exact: true }).click()
  await page.getByRole('heading', { name: 'Log a catch' }).waitFor()
  await expectChooser(page, 'Import a .sav')
  await page.screenshot({ path: `${shots}/phone-import-catch-review.png` })
  await context.close()
  console.log('filechooser: More and catch sheet both reached the review sheet')
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error))
  console.error(error)
}

const widths = [360, 390, 412]
const tabs = [
  ['Routes', 'routes'],
  ['Map', 'map'],
  ['Team', 'team'],
  ['Graveyard', 'grave'],
  ['More', 'more'],
]
try {
  for (const width of widths) {
    const context = await browser.newContext({
      ...pixel,
      hasTouch: true,
      viewport: { width, height: 800 },
    })
    const page = await context.newPage()
    await enterDemo(page)
    for (const [label, id] of tabs) {
      await page.getByRole('button', { name: label, exact: true }).click()
      await page.waitForTimeout(400)
      if (id === 'team') {
        await page.getByRole('button', { name: 'Both', exact: true }).click()
        await page.waitForTimeout(200)
      }
      const overflow = await page.evaluate(() => {
        const scroll = document.querySelector('.scroll')
        const doc = document.documentElement
        return {
          scroll: scroll ? scroll.scrollWidth - scroll.clientWidth : 0,
          doc: doc.scrollWidth - doc.clientWidth,
        }
      })
      if (overflow.scroll > 1 || overflow.doc > 1) {
        failures.push(`${id} @ ${width}px overflows ${JSON.stringify(overflow)}`)
      }
      const levels = id === 'team' ? await page.locator('.tcard .lv').allInnerTexts() : []
      if (id === 'team' && levels.some((text) => !/\d/.test(text))) {
        failures.push(`team @ ${width}px has an empty level badge: ${JSON.stringify(levels)}`)
      }
      await page.screenshot({ path: `${shots}/phone-${width}-${id}.png`, fullPage: false })
    }
    await page.locator('.scroll').evaluate((node) => { node.scrollTop = 280 })
    await page.waitForTimeout(200)
    const collide = await page.evaluate(() => {
      const demo = document.querySelector('.demo-bar')?.getBoundingClientRect()
      const hdr = document.querySelector('.hdr.sticky')?.getBoundingClientRect()
      if (!demo || !hdr) return 'missing'
      return demo.bottom > hdr.top + 1 ? `overlap demo ${demo.bottom} header ${hdr.top}` : 'clear'
    })
    if (collide !== 'clear') failures.push(`routes header @ ${width}px: ${collide}`)
    await page.screenshot({ path: `${shots}/phone-${width}-routes-scrolled.png` })
    await context.close()
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error))
  console.error(error)
}

await browser.close()
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('android import + width sweep ok')
