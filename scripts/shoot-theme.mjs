import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = 'artifacts'
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:5174/'

const browser = await chromium.launch()
for (const scheme of ['light', 'dark']) {
  const desk = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })
  const pd = await desk.newPage()
  await pd.goto(BASE, { waitUntil: 'load', timeout: 45000 })
  await pd.waitForSelector('#theme-toggle', { timeout: 15000 })
  await pd.waitForTimeout(700)
  await pd.screenshot({ path: `${OUT}/theme-${scheme}-desktop.png`, fullPage: true })
  await desk.close()

  const mob = await browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const pm = await mob.newPage()
  await pm.goto(BASE, { waitUntil: 'load', timeout: 45000 })
  await pm.waitForSelector('#theme-toggle', { timeout: 15000 })
  await pm.waitForTimeout(700)
  await pm.screenshot({ path: `${OUT}/theme-${scheme}-mobile.png`, fullPage: true })
  await mob.close()
}
await browser.close()
console.log('SHOTS OK: theme-light-desktop/mobile, theme-dark-desktop/mobile')
