import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Verifica que tocar/deslizar sobre el fondo verde del escenario 3D NO mueve
// el scroll de la pagina ni del dialogo, pero el resto del dialogo sigue
// scrolleando con normalidad.
const base = process.env.APP_URL || 'http://localhost:4173'
console.log('BASE', base)
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
})
const page = await context.newPage()
await page.goto(base, { waitUntil: 'networkidle' })

await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).click()
await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, null, { timeout: 60000 })

// 1) El escenario debe declarar touch-action: none
const mvTA = await page.locator('model-viewer').evaluate(el => getComputedStyle(el).touchAction)
const stageTA = await page.locator('.model-stage').evaluate(el => getComputedStyle(el).touchAction)
assert.equal(mvTA, 'none', `model-viewer touch-action = ${mvTA}`)
assert.equal(stageTA, 'none', `.model-stage touch-action = ${stageTA}`)
console.log('OK touch-action none en el escenario')

// 2) Gesto real (CDP touch) sobre el fondo verde: no debe scrollear
const cdp = await context.newCDPSession(page)
async function swipe(x, yFrom, dy) {
  const steps = 10
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: yFrom, id: 1 }] })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: yFrom + (dy * i) / steps, id: 1 }] })
    await new Promise(r => setTimeout(r, 16))
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

const scrollState = () => page.evaluate(() => ({
  dlg: document.querySelector('.dish-dialog')?.scrollTop ?? -1,
  doc: document.documentElement.scrollTop,
  win: window.scrollY,
}))

const stageBox = await page.locator('.model-stage').boundingBox()
assert.ok(stageBox, 'el escenario 3D debe estar visible')
const sx = stageBox.x + stageBox.width / 2
const sy = stageBox.y + stageBox.height * 0.7

// El punto del gesto debe caer dentro del escenario verde
const hit = await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y)
  const stage = document.querySelector('.model-stage')
  return { tag: el?.tagName?.toLowerCase() ?? '', inStage: !!(el && stage?.contains(el)) }
}, [sx, sy])
assert.ok(hit.inStage, `el gesto debe caer en el escenario (fue: ${hit.tag})`)

const before = await scrollState()
await swipe(sx, sy, -220)
await page.waitForTimeout(350)
const after = await scrollState()
assert.equal(after.dlg, before.dlg, `el escenario no debe mover el scroll del dialogo (${before.dlg} -> ${after.dlg})`)
assert.equal(after.doc, before.doc, `el escenario no debe mover el scroll del documento (${before.doc} -> ${after.doc})`)
assert.equal(after.win, before.win, `el escenario no debe mover la pagina (${before.win} -> ${after.win})`)
console.log('OK deslizar sobre el fondo verde no baja la pagina')

// 3) La zona de informacion (fuera del escenario) SI debe seguir scrolleando
const infoBox = await page.locator('.experience-info').boundingBox()
assert.ok(infoBox, 'la zona de informacion debe existir')
const y = Math.min(Math.max(infoBox.y + 80, 120), 780)
const beforeInfo = await scrollState()
await swipe(infoBox.x + infoBox.width / 2, y, -320)
await page.waitForTimeout(350)
const afterInfo = await scrollState()
const moved = (afterInfo.dlg - beforeInfo.dlg) + (afterInfo.doc - beforeInfo.doc) + (afterInfo.win - beforeInfo.win)
assert.ok(moved > 100, `la zona de informacion si debe scrollear (delta=${moved}, antes=${JSON.stringify(beforeInfo)}, despues=${JSON.stringify(afterInfo)})`)
console.log('OK la zona fuera del escenario sigue scrolleando')

console.log('PASS ALL')
await browser.close()
