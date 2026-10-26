/**
 * Phone import flow on a generated Unbound save.
 * Chromium and WebKit, 390×844. Nothing is written before Confirm.
 * Run: node e2e/import-flow.mjs
 * Start `npm run preview` first (port 4173).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const { chromium, webkit } = createRequire('/tmp/e2e/package.json')('playwright')
const base = process.env.APP_URL ?? 'http://127.0.0.1:4173/azure-soullink-tracking/'
const shots = '/opt/cursor/artifacts'
mkdirSync(shots, { recursive: true })

const fixtureDir = '/workspace/save-import/fixtures-synthetic'
const files = execFileSync('npx', ['tsx', '-e', `
  import { readFileSync, writeFileSync } from 'node:fs'
  import { buildSave, sampleSave } from './src/lib/save/synthetic.ts'
  import { VAR_STORY_ACT1, VAR_STORY_MAIN } from './src/lib/save/missions.ts'
  import { parseSave } from './src/lib/save/unbound-save.ts'
  import { allMons, identityOf } from './src/lib/save/save-diff.ts'
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
  const table = JSON.parse(readFileSync('./src/data/unbound/species-table.json', 'utf8'))
  const dex = JSON.parse(readFileSync('./src/data/unbound/dex.json', 'utf8'))
  const before = parseSave(new Uint8Array(readFileSync('./save-import/fixtures-synthetic/diff-a.sav')), { table, dexNames: dex })
  writeFileSync('/tmp/diff-a-ids.json', JSON.stringify(allMons(before).map((mon) => identityOf(mon))))
  function setExtVar(sectors, id, value) {
    const mem = 0x200 + 2 * (id - 0x5000)
    const regions = [[0, 0xf24, 0xff0 - 0xf24], [4, 0xd98, 0xff0 - 0xd98], [13, 0x450, 0xff0 - 0x450]]
    for (const byte of [0, 1]) {
      let offset = mem + byte
      const val = (value >> (8 * byte)) & 0xff
      for (const [sector, from, len] of regions) {
        if (offset < len) { sectors[sector][from + offset] = val; break }
        offset -= len
      }
    }
  }
  writeFileSync('/tmp/story-mid.sav', buildSave({
    indexA: 9,
    indexB: 1,
    mutate: (sectors) => {
      setExtVar(sectors, VAR_STORY_ACT1, 42)
      setExtVar(sectors, VAR_STORY_MAIN, 67)
    },
  }))
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
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, `${fixtureDir}/slots-both-damaged.sav`)
  await page.getByText('Both save slots are broken').waitFor()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, `${fixtureDir}/signature-vanilla.sav`)
  await page.getByText('does not look like a Pokémon Unbound (FireRed) save').waitFor()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, `${fixtureDir}/empty-save.sav`)
  await page.locator('[data-import="review"]').waitFor()
  const empty = await page.locator('.import-summary').innerText()
  if (!empty.includes('Leer') || !empty.includes('0:00:03') || !empty.includes('party 0')) {
    failures.push(`${engine} empty save summary: ${empty}`)
  }
  await page.screenshot({ path: `${shots}/phase8-${engine}-import-empty.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, `${fixtureDir}/ingame-trade.sav`)
  await page.locator('[data-decision="trade"]').first().waitFor()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, `${fixtureDir}/event-fateful.sav`)
  await page.locator('[data-decision="event"]').first().waitFor()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, `${fixtureDir}/hatched.sav`)
  await page.locator('[data-decision="hatched"]').first().waitFor()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, `${fixtureDir}/cherish-fossil.sav`)
  await page.locator('[data-decision="gift"]').first().waitFor()
  await page.screenshot({ path: `${shots}/phase8-${engine}-import-gift.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, `${fixtureDir}/duplicates-same-route.sav`)
  await page.locator('[data-import="review"]').waitFor()
  const duplicates = await page.locator('[data-duplicate="true"]').count()
  if (duplicates < 7) failures.push(`${engine} expected duplicate rows, saw ${duplicates}`)
  await page.screenshot({ path: `${shots}/phase8-${engine}-import-duplicates.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, `${fixtureDir}/unknown-species.sav`)
  await page.locator('[data-unknown="true"]').first().waitFor()
  const unknown = await page.locator('[data-mon="unknown Pokémon"]').count()
  if (unknown !== 7) failures.push(`${engine} expected 7 unknown Pokémon rows, saw ${unknown}`)
  if (await page.locator('[data-unknown="true"] [data-confirm="row"]').count()) {
    failures.push(`${engine} unknown species offered Confirm`)
  }
  await page.screenshot({ path: `${shots}/phase8-${engine}-import-unknown.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  const ids = JSON.parse(readFileSync('/tmp/diff-a-ids.json', 'utf8'))
  await page.evaluate((list) => {
    localStorage.setItem('sl-import-ids:demo-run', JSON.stringify(list))
  }, ids)
  await openImport(page, `${fixtureDir}/diff-b.sav`)
  await page.locator('[data-import="review"]').waitFor()
  for (const nick of ['NewR8', 'DupB', 'NewR7', 'NewR17', 'NewTrade', 'NewHatch', 'NewPreset']) {
    await page.locator(`[data-nick="${nick}"][data-new="true"]`).waitFor()
  }
  if (await page.locator('[data-nick="Bleibt"]').getAttribute('data-new') !== 'false') {
    failures.push(`${engine} Bleibt was marked new`)
  }
  if (await page.locator('[data-nick="DupB"]').getAttribute('data-new') !== 'true') {
    failures.push(`${engine} second Rattata was not new`)
  }
  const storedIds = await page.evaluate(() => localStorage.getItem('sl-import-ids:demo-run'))
  if (storedIds !== JSON.stringify(ids)) failures.push(`${engine} diff preview wrote identities`)
  await page.screenshot({ path: `${shots}/phase8-${engine}-import-diff.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await page.evaluate(() => localStorage.removeItem('sl-story-hint:demo-run'))
  await openImport(page, '/tmp/story-mid.sav')
  await page.locator('[data-story="suggestion"]').waitFor()
  const story = await page.locator('[data-story="suggestion"]').innerText()
  if (!story.includes('Missions completed') || !story.includes('of 84')) failures.push(`${engine} story card missing mission count: ${story}`)
  if (!story.includes('Distortion World') || !story.includes('Rift Cave')) failures.push(`${engine} story suggestion: ${story}`)
  if (!story.includes('Guess')) failures.push(`${engine} story suggestion missing guess badge`)
  const hinted = await page.evaluate(() => localStorage.getItem('sl-story-hint:demo-run'))
  if (hinted) failures.push(`${engine} story hint was stored before confirm`)
  const hereBefore = await page.evaluate(() => localStorage.getItem('sl-import-nats:demo-run'))
  await page.locator('[data-story="suggestion"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${shots}/phase9-${engine}-story-suggest.png` })
  await page.locator('[data-story-confirm]').click()
  await page.getByText('Shown on the guide. Here on the map stays your furthest catch.').waitFor()
  const hintedAfter = await page.evaluate(() => localStorage.getItem('sl-story-hint:demo-run'))
  if (!hintedAfter || !hintedAfter.includes('Distortion World')) failures.push(`${engine} confirm did not store the suggestion`)
  if (await page.evaluate(() => localStorage.getItem('sl-import-nats:demo-run')) !== hereBefore) {
    failures.push(`${engine} story confirm changed imported catches`)
  }
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Map', exact: true }).click()
  await page.locator('[data-story-suggest]').waitFor()
  const onMap = await page.locator('[data-story-suggest]').innerText()
  if (!onMap.includes('Distortion World') || !onMap.includes('Rift Cave') || !onMap.includes('Guess')) {
    failures.push(`${engine} map suggestion: ${onMap}`)
  }
  const hereNode = await page.locator('[data-here="true"]').getAttribute('data-map-node')
  if (hereNode !== 'route-6') failures.push(`${engine} story confirm moved Here to ${hereNode}`)
  await page.locator('[data-story-suggest]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${shots}/phase9-${engine}-story-map.png` })
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
