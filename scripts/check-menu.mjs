import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

await mkdir('artifacts', { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
try {
  const page = await browser.newPage()
  const errors = []
  const modelRequests = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (request.url().endsWith('.glb')) modelRequests.push(request.url()) })
  await page.goto(process.env.APP_URL || 'http://localhost:5173')
  await page.getByRole('heading', { name: 'La carta.' }).waitFor()
  assert.equal(modelRequests.length, 0, 'The menu must not download the 3D model before opening it')
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}px`)
    if (width === 390 || width === 1440) await page.screenshot({ path: `artifacts/menu-${width}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const trigger = page.getByRole('button', { name: 'Explorar en 3D', exact: true })
  await trigger.click()
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, null, { timeout: 60000 })
  const dimensions = await page.locator('model-viewer').evaluate(viewer => ({ x: viewer.getDimensions().x, y: viewer.getDimensions().y, scale: viewer.getAttribute('ar-scale') }))
  assert.ok(Math.abs(dimensions.x - 0.12) < 0.0001)
  assert.ok(Math.abs(dimensions.y - 0.06) < 0.005)
  assert.equal(dimensions.scale, 'fixed')
  const dialog = page.getByRole('dialog')
  const bounds = await dialog.boundingBox()
  assert.ok(Math.abs(bounds.x) < 1 && Math.abs(bounds.y) < 1 && Math.abs(bounds.width - 390) < 1, 'Mobile dialog must fill the viewport without translation')
  await page.getByRole('button', { name: 'Girar automáticamente' }).click()
  assert.equal(await page.locator('model-viewer').evaluate(viewer => viewer.autoRotate), true)
  await page.getByRole('button', { name: 'Restablecer vista' }).click()
  assert.equal(await page.locator('model-viewer').evaluate(viewer => viewer.autoRotate), false)
  await page.screenshot({ path: 'artifacts/viewer-mobile-initial.png' })
  await page.getByRole('button', { name: 'Tamaño del plato' }).click()
  await page.getByText(/Aproximadamente 12 cm/).waitFor()
  await page.screenshot({ path: 'artifacts/viewer-mobile.png' })
  await page.keyboard.press('Escape')
  assert.equal(await trigger.evaluate(button => button === document.activeElement), true, 'Focus returns to the trigger')
  await page.getByRole('button', { name: 'Cómo funciona' }).click()
  await page.getByRole('heading', { name: 'Primero mira. Luego disfruta.' }).waitFor()
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await page.route('**/models/*.glb', route => route.abort())
  await page.reload()
  await trigger.click()
  await page.getByRole('heading', { name: 'No se pudo cargar la vista 3D.' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Ver en mi mesa', exact: true }).last().isDisabled(), true)
  await page.unroute('**/models/*.glb')
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, null, { timeout: 60000 })
  assert.deepEqual(errors, [])
  console.log('PASS: responsive layouts, lazy model loading, physical dimensions, fixed AR scale, mobile dialog, rotation/reset, size details, focus restoration, help, failure and retry.')
} finally {
  await browser.close()
}
