/**
 * Phone import flow on a generated Unbound save.
 * Chromium and WebKit, 390×844. Nothing is written before Confirm.
 * Run: node e2e/import-flow.mjs
 * Start `npm run preview` first (port 4173).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const { chromium, webkit } = createRequire('/tmp/e2e/package.json')('playwright')
const base = process.env.APP_URL ?? 'http://127.0.0.1:4173/azure-soullink-tracking/'
const shots = '/opt/cursor/artifacts'
mkdirSync(shots, { recursive: true })

const files = execFileSync('npx', ['tsx', '-e', `
  import { writeFileSync } from 'node:fs'
  import { buildSave, sampleSave } from './src/lib/save/synthetic.ts'
  writeFileSync('/tmp/sample-unbound.sav', sampleSave())
  writeFileSync('/tmp/tiny.sav', new Uint8Array(1000))
  const broken = buildSave({ indexA: 4, indexB: 3 })
  broken[0x100] ^= 0xff
  broken[0xe000 + 0x100] ^= 0xff
  writeFileSync('/tmp/both-slots.sav', broken)
  const foreign = buildSave({ indexA: 4, indexB: 2 })
  const view = new DataView(foreign.buffer)
  for (let slot = 0; slot < 2; slot++) {
    for (let sector = 0; sector < 14; sector++) view.setUint32(slot * 0xe000 + sector * 0x1000 + 0xff8, 0x08012025, true)
  }
  writeFileSync('/tmp/firered-sig.sav', foreign)
`], { cwd: '/workspace', encoding: 'utf8' })
if (files) process.stdout.write(files)

const failures = []

async function enterDemo(page) {
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'View demo' }).click()
  await page.getByText('DEMO', { exact: true }).waitFor()
}

async function openImport(page, file) {
  await page.getByRole('button', { name: 'More', exact: true }).click()
  const input = page.getByLabel('Import save')
  await input.waitFor({ state: 'attached' })
  const box = await input.boundingBox()
  if (!box || box.width < 40 || box.height < 36) throw new Error(`Import save hit box is off screen: ${JSON.stringify(box)}`)
  const pending = page.waitForEvent('filechooser', { timeout: 8000 })
  await input.tap()
  const chooser = await pending
  await chooser.setFiles(file)
}

async function checkMap(page, engine) {
  await page.getByRole('button', { name: 'Map', exact: true }).click()
  await page.locator('[data-here="true"]').waitFor()
  await page.locator('[data-next="true"]').waitFor()
  const zoomed = await page.evaluate(() => {
    const stage = document.querySelector('.map-stage')?.getBoundingClientRect()
    const header = document.querySelector('.hdr.sticky')?.getBoundingClientRect()
    const dock = document.querySelector('.dock')?.getBoundingClientRect()
    const here = document.querySelector('[data-here="true"]')?.getBoundingClientRect()
    const towns = [...document.querySelectorAll('.map-node.town .lbl')].map((node) => node.textContent?.trim()).filter(Boolean)
    const routeLabels = document.querySelectorAll('.map-node.route .lbl').length
    return {
      stageTop: stage?.top ?? -1,
      headerBottom: header?.bottom ?? -1,
      dockTop: dock?.top ?? 9999,
      here: here ? { x: here.x, y: here.y, w: here.width } : null,
      towns,
      routeLabels,
      stageBottom: stage?.bottom ?? 0,
    }
  })
  if (zoomed.stageTop < zoomed.headerBottom - 1) failures.push(`${engine} map sits under the header`)
  if (zoomed.stageBottom > zoomed.dockTop + 1) failures.push(`${engine} map stage covers the dock`)
  if (!zoomed.towns.some((name) => /Dresco|Dehara|Blizzard|Seaport/.test(name))) failures.push(`${engine} zoomed map is missing town labels: ${zoomed.towns.join(', ')}`)
  if (zoomed.routeLabels < 1) failures.push(`${engine} zoomed map hides route labels`)
  await page.screenshot({ path: `${shots}/phase8-${engine}-map-zoom.png` })

  const core = page.locator('[data-here="true"] .core')
  const coreBox = await core.boundingBox()
  if (!coreBox || coreBox.width < 8) throw new Error(`${engine} current route marker is not tappable`)
  await page.touchscreen.tap(coreBox.x + coreBox.width / 2, coreBox.y + coreBox.height / 2)
  await page.locator('.sheet-peek').waitFor({ timeout: 4000 })
  const sheet = await page.evaluate(() => {
    const peek = document.querySelector('.sheet-peek')?.getBoundingClientRect()
    const dock = document.querySelector('.dock')?.getBoundingClientRect()
    const header = document.querySelector('.hdr.sticky')?.getBoundingClientRect()
    return {
      top: peek?.top ?? 0,
      bottom: peek?.bottom ?? 0,
      dockTop: dock?.top ?? 0,
      headerBottom: header?.bottom ?? 0,
      title: document.querySelector('.sheet-peek')?.textContent ?? '',
    }
  })
  if (!sheet.title.includes('Route 6')) failures.push(`${engine} map sheet did not open the current route`)
  if (sheet.bottom > sheet.dockTop + 2) failures.push(`${engine} map sheet covers the dock (${sheet.bottom} > ${sheet.dockTop})`)
  if (sheet.top < sheet.headerBottom) failures.push(`${engine} map sheet covers the header`)
  await page.screenshot({ path: `${shots}/phase8-${engine}-map-sheet.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await page.getByRole('button', { name: 'Entire map' }).click()
  await page.waitForTimeout(250)
  const wide = await page.evaluate(() => ({
    towns: document.querySelectorAll('.map-node.town .lbl').length,
    routes: document.querySelectorAll('.map-node.route .lbl').length,
    islands: document.querySelectorAll('[data-island]').length,
  }))
  if (wide.towns < 10) failures.push(`${engine} entire map shows ${wide.towns} town labels`)
  if (wide.routes !== 0) failures.push(`${engine} entire map still shows ${wide.routes} route labels`)
  if (wide.islands !== 3) failures.push(`${engine} expected 3 islands, saw ${wide.islands}`)
  await page.screenshot({ path: `${shots}/phase8-${engine}-map-all.png` })
}

async function checkImport(page, engine) {
  await page.evaluate(() => localStorage.setItem('sl-import-nats:demo-run', JSON.stringify([1])))
  const before = await page.locator('body').innerText()
  if (before.includes('Zeraora')) failures.push(`${engine} Zeraora was on screen before import`)

  await openImport(page, '/tmp/sample-unbound.sav')
  await page.locator('[data-import="review"]').waitFor({ timeout: 8000 })
  const summary = await page.locator('.import-summary').innerText()
  if (!summary.includes('Test')) failures.push(`${engine} summary missing trainer: ${summary}`)
  if (!summary.includes('12:34:56')) failures.push(`${engine} summary missing play time: ${summary}`)
  if (!summary.includes('Pokédex caught')) failures.push(`${engine} summary missing counts: ${summary}`)
  await page.locator('[data-mon="Zeraora"][data-new="true"]').waitFor()
  await page.locator('[data-mon="Goldeen"][data-new="true"]').waitFor()
  await page.locator('[data-mon="Bulbasaur"][data-new="false"]').waitFor()
  const denied = await page.locator('[data-import-denied]').getAttribute('data-import-denied')
  if (denied !== 'false') failures.push(`${engine} import already denied before confirm`)
  const stored = await page.evaluate(() => localStorage.getItem('sl-import-nats:demo-run'))
  if (stored !== JSON.stringify([1])) failures.push(`${engine} import wrote nats before confirm: ${stored}`)
  await page.screenshot({ path: `${shots}/phase8-${engine}-import-review.png` })

  await page.locator('[data-mon="Zeraora"] [data-confirm="row"]').click()
  await page.getByText("Demo mode – changes aren't saved").waitFor()
  if (await page.locator('[data-import-denied]').getAttribute('data-import-denied') !== 'true') {
    failures.push(`${engine} confirm did not stay in demo`)
  }
  const after = await page.evaluate(() => localStorage.getItem('sl-import-nats:demo-run'))
  if (after !== JSON.stringify([1])) failures.push(`${engine} confirm wrote nats in demo: ${after}`)
  await page.screenshot({ path: `${shots}/phase8-${engine}-import-confirm.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, '/tmp/tiny.sav')
  await page.getByText('wrong size').waitFor()
  await page.screenshot({ path: `${shots}/phase8-${engine}-import-size.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, '/tmp/both-slots.sav')
  await page.getByText('Both save slots are broken').waitFor()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, '/tmp/firered-sig.sav')
  await page.getByText('does not look like a Pokémon Unbound (FireRed) save').waitFor()
  await page.screenshot({ path: `${shots}/phase8-${engine}-import-firered.png` })
}

for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  try {
    await enterDemo(page)
    await checkMap(page, engine)
    await checkImport(page, engine)
    console.log(`${engine} import + map ok`)
  } catch (error) {
    failures.push(`${engine}: ${error instanceof Error ? error.message : String(error)}`)
    await page.screenshot({ path: `${shots}/phase8-${engine}-fail.png` }).catch(() => {})
    console.error(engine, error)
  }
  await context.close()
  await browser.close()
}

writeFileSync('/tmp/phase8-e2e-failures.txt', failures.join('\n'))
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('import flow ok')
