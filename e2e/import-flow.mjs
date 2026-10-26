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
  import { boxMon, boxSlot, buildSave, sampleSave } from './src/lib/save/synthetic.ts'
  import { FLAG_NGPLUS, FLAG_RANDOMIZER_SPECIES, FLAG_SANDBOX, VAR_DIFFICULTY } from './src/lib/save/run-options.ts'
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
  const sample = parseSave(sampleSave(), { table, dexNames: dex })
  const bulb = allMons(sample).find((mon) => mon.nat === 1)
  writeFileSync('/tmp/sample-bulb-id.txt', identityOf(bulb))
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
  const regions = [[0, 0xf24, 0xff0 - 0xf24], [4, 0xd98, 0xff0 - 0xd98], [13, 0x450, 0xff0 - 0x450]]
  function setFlag(sectors, id) {
    const bit = id - 0x900
    let offset = bit >> 3
    for (const [sector, from, len] of regions) {
      if (offset < len) { sectors[sector][from + offset] |= 1 << (bit & 7); return }
      offset -= len
    }
  }
  writeFileSync('/tmp/starter-options.sav', buildSave({
    indexA: 8,
    indexB: 1,
    mutate: (sectors) => {
      boxMon(sectors, boxSlot(0, 0), null, 0, 1, 1000, 1010, { location: 133, level: 10, ball: 3 })
      boxMon(sectors, boxSlot(0, 1), null, 0, 557, 800, 2020, { location: 101, level: 8, ball: 3 })
      boxMon(sectors, boxSlot(0, 2), null, 0, 4, 1000, 3030, { location: 88, level: 10, ball: 3 })
      boxMon(sectors, boxSlot(0, 3), null, 0, 6, 100000, 4040, { location: 133, level: 65, ball: 0 })
      setFlag(sectors, FLAG_RANDOMIZER_SPECIES)
      setFlag(sectors, FLAG_NGPLUS)
      setFlag(sectors, FLAG_SANDBOX)
      setExtVar(sectors, VAR_DIFFICULTY, 1)
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

  for (const scale of [0.3, 0.5, 0.9, 1.5]) {
    await page.evaluate((value) => window.dispatchEvent(new CustomEvent('soullink-map-scale', { detail: value })), scale)
    await page.waitForFunction((value) => {
      const got = Number(document.querySelector('.map-svg')?.getAttribute('data-scale'))
      return Math.abs(got - value) < 0.02
    }, scale)
    const labels = await page.evaluate(() => {
      const zoom = Number(document.querySelector('.map-svg')?.getAttribute('data-scale'))
      const nodes = [...document.querySelectorAll('.map-node .lbl')]
      const screens = nodes.map((node) => Number(node.getAttribute('font-size')) * zoom)
      return {
        zoom,
        towns: document.querySelectorAll('.map-node.town .lbl').length,
        routes: document.querySelectorAll('.map-node.route .lbl').length,
        min: screens.length ? Math.min(...screens) : 0,
        max: screens.length ? Math.max(...screens) : 0,
      }
    })
    if (labels.towns < 1) failures.push(`${engine} zoom ${scale} has no town labels`)
    if (scale < 0.34 && labels.routes !== 0) failures.push(`${engine} zoom ${scale} shows ${labels.routes} route labels`)
    if (scale >= 0.5 && labels.routes < 1) failures.push(`${engine} zoom ${scale} hides route labels`)
    if (labels.min < 8.9 || labels.max > 14.1) failures.push(`${engine} zoom ${scale} label screen px ${labels.min}–${labels.max}`)
    await page.screenshot({ path: `${shots}/phase11-${engine}-map-${String(scale).replace('.', '')}.png` })
  }
}

async function rowFacts(page, name) {
  const row = page.locator(`[data-mon="${name}"]`)
  await row.waitFor()
  const route = await row.locator('select').inputValue()
  const routeLabel = route ? await row.locator('select option:checked').innerText() : ''
  const confirm = row.locator('[data-confirm="row"]')
  return {
    row,
    starter: await row.getAttribute('data-starter'),
    decision: await row.getAttribute('data-decision'),
    confidence: await row.getAttribute('data-confidence'),
    met: await row.getAttribute('data-met'),
    text: await row.innerText(),
    route,
    routeLabel,
    confirmEnabled: (await confirm.count()) > 0 && await confirm.isEnabled(),
  }
}

async function checkStarterAndOptions(page, engine) {
  const species = page.getByRole('checkbox', { name: /Species randomizer/ })
  const ngPlus = page.getByRole('checkbox', { name: /New Game Plus/ })
  if (!(await species.isChecked())) failures.push(`${engine} demo species randomizer started off`)
  if (!(await ngPlus.isChecked())) failures.push(`${engine} demo NG+ started off`)
  await page.getByText(/^Species randomizer:/).click()
  await page.getByText('New Game Plus', { exact: true }).click()
  await page.getByRole('button', { name: 'Difficult+', exact: true }).click()
  if (await species.isChecked()) failures.push(`${engine} species randomizer stayed on`)
  if (await ngPlus.isChecked()) failures.push(`${engine} NG+ stayed on`)

  await openImport(page, '/tmp/starter-options.sav')
  await page.locator('[data-import="review"]').waitFor({ timeout: 8000 })
  const starter = await rowFacts(page, 'Bulbasaur')
  if (starter.starter !== 'S1' || starter.decision !== 'starter' || starter.confidence !== 'likely' || starter.met !== '133') {
    failures.push(`${engine} S1 starter ${JSON.stringify({ starter: starter.starter, decision: starter.decision, confidence: starter.confidence, met: starter.met })}`)
  }
  if (!starter.text.includes('Starter (likely)') || !starter.text.includes('Likely')) failures.push(`${engine} S1 copy: ${starter.text}`)
  if (starter.route !== '' || starter.confirmEnabled) failures.push(`${engine} S1 was offered as a route catch`)
  const patrat = await rowFacts(page, 'Patrat')
  if (patrat.starter !== '' || patrat.decision !== '' || patrat.confidence !== 'likely' || patrat.met !== '101' || patrat.route !== 'route-1') {
    failures.push(`${engine} Patrat ${JSON.stringify({ starter: patrat.starter, decision: patrat.decision, confidence: patrat.confidence, met: patrat.met, route: patrat.route })}`)
  }
  if (patrat.routeLabel.trim() !== 'Route 1') failures.push(`${engine} Patrat route label: ${patrat.routeLabel}`)
  const legacy = await rowFacts(page, 'Charmander')
  if (legacy.starter !== 'S2' || legacy.decision !== 'starter' || legacy.confidence !== 'guess' || legacy.met !== '88') {
    failures.push(`${engine} S2 starter ${JSON.stringify({ starter: legacy.starter, decision: legacy.decision, confidence: legacy.confidence, met: legacy.met })}`)
  }
  if (!legacy.text.includes('Starter (guess)') || !legacy.text.includes('Guess')) failures.push(`${engine} S2 copy: ${legacy.text}`)
  if (legacy.route !== '' || legacy.confirmEnabled) failures.push(`${engine} S2 was offered as a route catch`)
  const late = await rowFacts(page, 'Charizard')
  if (late.starter !== '' || late.decision === 'starter' || late.met !== '133') {
    failures.push(`${engine} late Shadow Base mon was classified as a starter`)
  }
  if (late.text.includes('Starter (')) failures.push(`${engine} late mon copy: ${late.text}`)
  const ready = await page.locator('[data-confirm="all"]').innerText()
  if (ready.includes('Bulbasaur') || ready.includes('Charmander')) failures.push(`${engine} confirm all named a starter`)
  await page.locator('[data-mon="Bulbasaur"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${shots}/phase11-${engine}-starter.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  const detect = page.getByLabel('Detect run options from a save')
  await detect.waitFor({ state: 'attached' })
  const pending = page.waitForEvent('filechooser', { timeout: 8000 })
  await detect.tap()
  const chooser = await pending
  await chooser.setFiles('/tmp/starter-options.sav')
  await page.locator('[data-run-options="ready"]').waitFor()
  const option = async (key) => {
    const row = page.locator(`[data-option="${key}"]`)
    return {
      confidence: await row.getAttribute('data-confidence'),
      apply: await row.getAttribute('data-apply'),
      text: await row.innerText(),
      boxes: await row.locator('input').count(),
    }
  }
  const speciesRow = await option('randomizer.species')
  if (speciesRow.confidence !== 'certain' || speciesRow.apply !== 'true' || speciesRow.boxes !== 1 || !speciesRow.text.includes('On') || !speciesRow.text.includes('Certain')) {
    failures.push(`${engine} species detection ${JSON.stringify(speciesRow)}`)
  }
  const ngRow = await option('ngplus.active')
  if (ngRow.confidence !== 'guess' || ngRow.apply !== 'false' || ngRow.boxes !== 0 || !ngRow.text.includes('On') || !ngRow.text.includes('Guess')) {
    failures.push(`${engine} NG+ detection ${JSON.stringify(ngRow)}`)
  }
  const nuzRow = await option('nuzlocke')
  if (nuzRow.confidence !== 'unknown' || nuzRow.apply !== 'false' || nuzRow.boxes !== 0 || !nuzRow.text.includes('Not in the save') || !nuzRow.text.includes('Unknown')) {
    failures.push(`${engine} Nuzlocke detection ${JSON.stringify(nuzRow)}`)
  }
  const diffRow = await option('difficulty')
  if (diffRow.confidence !== 'likely' || diffRow.apply !== 'true' || !diffRow.text.includes('Vanilla') || !diffRow.text.includes('Likely')) {
    failures.push(`${engine} difficulty detection ${JSON.stringify(diffRow)}`)
  }
  const sandboxRow = await option('sandbox')
  if (sandboxRow.confidence !== 'likely' || !sandboxRow.text.includes('On')) failures.push(`${engine} sandbox detection ${JSON.stringify(sandboxRow)}`)
  if (await page.locator('[data-apply-options]').isEnabled()) failures.push(`${engine} Apply selected started enabled`)
  await page.locator('[data-option="ngplus.active"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${shots}/phase11-${engine}-detect.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  if (await species.isChecked() || await ngPlus.isChecked()) failures.push(`${engine} closing detect wrote options`)
  if ((await page.getByRole('button', { name: 'Difficult+', exact: true }).getAttribute('aria-pressed')) !== 'true') {
    failures.push(`${engine} closing detect changed difficulty`)
  }

  const pendingAgain = page.waitForEvent('filechooser', { timeout: 8000 })
  await detect.tap()
  const chooserAgain = await pendingAgain
  await chooserAgain.setFiles('/tmp/starter-options.sav')
  await page.locator('[data-run-options="ready"]').waitFor()
  await page.getByRole('checkbox', { name: 'Apply Species randomizer' }).check()
  await page.getByRole('checkbox', { name: 'Apply Difficulty' }).check()
  await page.locator('[data-apply-options]').click()
  await page.getByText("Demo mode – changes aren't saved").waitFor()
  await page.locator('[data-run-options="ready"]').waitFor({ state: 'detached' })
  if (!(await species.isChecked())) failures.push(`${engine} applying species left it off`)
  if (await ngPlus.isChecked()) failures.push(`${engine} applying detection turned NG+ on`)
  if ((await page.getByRole('button', { name: 'Vanilla', exact: true }).getAttribute('aria-pressed')) !== 'true') {
    failures.push(`${engine} applying difficulty did not select Vanilla`)
  }
  if (!(await page.getByText('Nuzlocke is not stored in the save').count())) {
    failures.push(`${engine} Nuzlocke tracker copy changed`)
  }
}

async function checkImport(page, engine) {
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByText('Nuzlocke', { exact: true }).waitFor()
  await page.locator('[data-cap-ladder="ngplus"]').waitFor()
  if (await page.getByText('Coming soon').count()) failures.push(`${engine} More still says Coming soon`)
  await page.screenshot({ path: `${shots}/phase11-${engine}-more-settings.png` })
  await checkStarterAndOptions(page, engine)
  const bulbId = readFileSync('/tmp/sample-bulb-id.txt', 'utf8').trim()
  await page.evaluate((id) => {
    localStorage.setItem('sl-import-nats:demo-run', JSON.stringify([1]))
    localStorage.setItem('sl-import-ids:demo-run', JSON.stringify([id]))
  }, bulbId)
  const before = await page.locator('body').innerText()
  if (before.includes('Zeraora')) failures.push(`${engine} Zeraora was on screen before import`)

  await openImport(page, '/tmp/sample-unbound.sav')
  await page.locator('[data-import="review"]').waitFor({ timeout: 8000 })
  const summary = await page.locator('.import-summary').innerText()
  if (!summary.includes('Test')) failures.push(`${engine} summary missing trainer: ${summary}`)
  if (!summary.includes('12:34:56')) failures.push(`${engine} summary missing play time: ${summary}`)
  if (!/party \d+, boxes \d+/.test(summary)) failures.push(`${engine} summary missing party and boxes: ${summary}`)
  if (summary.includes('Pokédex caught')) failures.push(`${engine} summary still uses the dex as a run count: ${summary}`)
  await page.locator('[data-mon="Zeraora"][data-new="true"]').waitFor()
  await page.locator('[data-mon="Goldeen"][data-new="true"]').waitFor()
  if (await page.locator('[data-mon="Bulbasaur"]').count() !== 0) failures.push(`${engine} already imported Bulbasaur was suggested again`)
  const known = await page.locator('[data-known]').getAttribute('data-known')
  if (known !== '1') failures.push(`${engine} known count ${known}`)
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
  if (!empty.includes('Leer') || !empty.includes('0:00:03') || !empty.includes('party 0, boxes 0')) {
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
  if (unknown !== 6) failures.push(`${engine} expected 6 unknown Pokémon rows, saw ${unknown}`)
  if (await page.locator('[data-unknown="true"] [data-confirm="row"]').count()) {
    failures.push(`${engine} unknown species offered Confirm`)
  }
  if (await page.locator('[data-unknown="true"]').filter({ hasText: 'Shiny?' }).count()) {
    failures.push(`${engine} unknown row shows a shiny guess`)
  }
  await page.screenshot({ path: `${shots}/phase8-${engine}-import-unknown.png` })
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await openImport(page, `${fixtureDir}/released-slots.sav`)
  await page.locator('[data-import="review"]').waitFor()
  const releasedSummary = await page.locator('.import-summary').innerText()
  const releasedCount = await page.locator('.import-summary').getAttribute('data-released')
  if (releasedCount !== '8') failures.push(`${engine} released remnants ${releasedCount}: ${releasedSummary}`)
  if (!releasedSummary.includes('party') || !releasedSummary.includes('boxes')) failures.push(`${engine} released summary: ${releasedSummary}`)
  if (await page.getByText(/Species 0|unknown Pokémon/).count()) failures.push(`${engine} released slot was shown as a Pokémon`)
  if (await page.locator('[data-released-note="true"]').innerText() !== '8 released slots ignored.') {
    failures.push(`${engine} missing released-slot note`)
  }
  await page.screenshot({ path: `${shots}/phase11-${engine}-import-released.png` })
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
  if (await page.locator('[data-nick="Bleibt"]').count() !== 0) {
    failures.push(`${engine} already imported Bleibt was suggested again`)
  }
  const gone = await page.locator('[data-prompt="Dead/gone?"]').count()
  if (gone < 1) failures.push(`${engine} missing Pokémon was not left as Dead/gone`)
  if (await page.locator('[data-import-group="missing"] [data-confirm="row"]').count()) {
    failures.push(`${engine} Dead/gone offered a write`)
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
