import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = 'artifacts'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:4173/'

const browser = await chromium.launch()
for (const scheme of ['light', 'dark']) {
  const desk = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })
  const pd = await desk.newPage()
  await pd.goto(BASE, { waitUntil: 'load', timeout: 45000 })
  await pd.waitForSelector('#theme-toggle', { timeout: 15000 })
  await pd.waitForTimeout(900)
  await pd.screenshot({ path: `${OUT}/comic-${scheme}-desktop.png`, fullPage: true })
  await desk.close()

  const mob = await browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const pm = await mob.newPage()
  await pm.goto(BASE, { waitUntil: 'load', timeout: 45000 })
  await pm.waitForSelector('#theme-toggle', { timeout: 15000 })
  await pm.waitForTimeout(900)
  await pm.screenshot({ path: `${OUT}/comic-${scheme}-mobile.png`, fullPage: true })
  await mob.close()

  // Dialogo 3D en movil
  const dv = await browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const pv = await dv.newPage()
  await pv.goto(BASE, { waitUntil: 'load', timeout: 45000 })
  await pv.getByRole('button', { name: 'Explorar en 3D', exact: true }).click()
  await pv.waitForFunction(() => document.querySelector('model-viewer')?.loaded, null, { timeout: 60000 })
  await pv.waitForTimeout(700)
  await pv.screenshot({ path: `${OUT}/comic-${scheme}-viewer-mobile.png` })
  await dv.close()
}
await browser.close()
console.log('SHOTS OK: comic light/dark desktop+mobile+viewer')
