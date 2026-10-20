import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
await mkdir('artifacts/closed', { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const errors = [], requests = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('request', r => { if (/\.glb(?:\?|$)/.test(r.url())) requests.push(r.url()) })
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173')
  await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).waitFor()
  assert.equal(requests.length, 0)
  await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded)
  await page.waitForTimeout(500)
  await page.evaluate(() => { window.testViewer = document.querySelector('model-viewer') })
  assert.equal(await page.getByRole('button', { name: 'Por ingredientes', exact: true }).count(), 0)
  assert.equal(await page.locator('model-viewer').evaluate(v => v.currentTime), 0)
  await page.locator('.model-section').screenshot({ path: 'artifacts/closed/assembled-mobile.png' })
  await page.getByRole('button', { name: 'Separar ingredientes', exact: true }).click()
  await page.waitForTimeout(350)
  const middle = await page.locator('model-viewer').evaluate(v => v.currentTime)
  assert.ok(middle > 0 && middle < .99, `Animation must have intermediate frames: ${middle}`)
  await page.waitForTimeout(1000)
  assert.ok(await page.locator('model-viewer').evaluate(v => v.currentTime > .99))
  assert.equal(await page.evaluate(() => window.testViewer === document.querySelector('model-viewer')), true)
  assert.equal(requests.length, 1, 'Exploding must not replace or redownload the GLB')
  await page.locator('.model-section').screenshot({ path: 'artifacts/closed/exploded-mobile.png' })
  await page.locator('.model-stage').scrollIntoViewIfNeeded()
  const points = await page.locator('model-viewer').evaluate(v => {
    const b = v.getBoundingClientRect(), groups = {}
    for (let y = b.top + 50; y < b.bottom - 10; y += 8) {
      for (let x = b.left + 20; x < b.right - 20; x += 8) {
        const name = v.materialFromPoint(x, y)?.name
        const id = ['top-bun', 'bottom-bun', 'egg', 'tomato'].find(id => name?.startsWith(id))
        if (id) (groups[id] ??= []).push({ x, y })
      }
    }
    return Object.fromEntries(Object.entries(groups).map(([id, p]) => [id, p[Math.floor(p.length / 2)]]))
  })
  console.log('Touch targets:', points)
  for (const [id, label] of [['top-bun','Pan superior'], ['bottom-bun','Pan inferior'], ['egg','Huevo'], ['tomato','Tomate']]) {
    assert.ok(points[id], `${id} needs a visible touchable surface`)
    await page.touchscreen.tap(points[id].x, points[id].y)
    await page.locator('.ingredient-card strong').getByText(label, { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Cerrar información del ingrediente' }).click()
  }
  await page.getByRole('button', { name: 'Reunir hamburguesa', exact: true }).click()
  await page.waitForTimeout(1200)
  assert.equal(await page.locator('model-viewer').evaluate(v => v.currentTime), 0)
  assert.equal(requests.length, 1)
  // Reverse the animation while it is still running.
  await page.getByRole('button', { name: 'Separar ingredientes', exact: true }).click()
  await page.waitForTimeout(150)
  await page.getByRole('button', { name: 'Reunir hamburguesa', exact: true }).click()
  await page.waitForTimeout(1200)
  assert.equal(await page.locator('model-viewer').evaluate(v => v.currentTime), 0)
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 }); await page.waitForTimeout(150)
    assert.equal(await page.getByRole('dialog').evaluate(el => el.scrollWidth > el.clientWidth), false, `Overflow ${width}`)
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Separar ingredientes', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('model-viewer').currentTime > .99, null, { timeout: 5000 })
  assert.ok(await page.locator('model-viewer').evaluate(v => v.currentTime > .99))
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.activeElement?.tagName === 'BUTTON' && document.activeElement?.textContent?.trim() === 'Explorar en 3D')
  await page.route('**/models/v3/assembly.glb*', route => route.abort())
  await page.reload()
  await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).click()
  await page.getByRole('heading', { name: 'No se pudo cargar la vista 3D.' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Separar ingredientes', exact: true }).isDisabled(), true)
  await page.unroute('**/models/v3/assembly.glb*')
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded)
  assert.deepEqual(errors, [])
  console.log('PASS: one persistent model, continuous/reversible explosion, actual touch selection of all ingredients, reduced motion, mobile layouts and no JS errors.')
  // Surface inspection only; each closed asset is rendered from both sides.
  await page.setViewportSize({ width: 700, height: 950 })
  for (const name of ['top-bun','bottom-bun','egg','tomato']) {
    await page.locator('model-viewer').evaluate((v,name) => { v.src = `/models/v3/${name}.glb`; v.cameraTarget = 'auto auto auto'; v.cameraOrbit = '30deg 55deg 105%' },name)
    await page.waitForFunction(name => { const v=document.querySelector('model-viewer'); return v?.loaded && v.src.endsWith(`/${name}.glb`) },name)
    await page.waitForTimeout(400)
    await page.locator('.model-stage').screenshot({ path: `artifacts/closed/${name}-top.png` })
    await page.locator('model-viewer').evaluate(async v => { v.cameraOrbit = '0deg 145deg 105%'; await v.updateComplete; v.jumpCameraToGoal() })
    await page.waitForTimeout(250)
    await page.locator('.model-stage').screenshot({ path: `artifacts/closed/${name}-underside.png` })
  }
} finally { await browser.close() }
