import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

await mkdir('artifacts/food', { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const base = process.env.APP_URL || 'http://127.0.0.1:5173'
const exportIOS = process.argv.includes('--export-ios')
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const errors = []; const downloads = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('request', r => { if (/\.glb(?:\?|$)/.test(r.url())) downloads.push(r.url()) })
  await page.goto(base)
  await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).waitFor()
  assert.equal(downloads.length, 0, '3D assets should load only on request')
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Menu overflow at ${width}`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).click()
  async function ready(name) {
    await page.waitForFunction((name) => {
      const v = document.querySelector('model-viewer')
      return v?.loaded && v.src.includes(`/${name}.glb`)
    }, name, { timeout: 60000 })
    await page.waitForTimeout(600)
    const dimensions = await page.locator('model-viewer').evaluate(v => ({ dimensions: v.getDimensions(), orbit: v.getCameraOrbit(), animations: v.availableAnimations, duration: v.duration, time: v.currentTime }))
    console.log(name, JSON.stringify(dimensions))
    await page.locator('.model-section').screenshot({ path: `artifacts/food/${name}.png` })
    if (exportIOS) {
      const data = await page.locator('model-viewer').evaluate(async v => {
        const url = await v.prepareUSDZ()
        const blob = await (await fetch(url)).blob()
        const bytes = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        URL.revokeObjectURL(url)
        return bytes
      })
      await writeFile(`public/models/clean/${name}.usdz`, Buffer.from(data, 'base64'))
    }
    return dimensions
  }
  const burger = await ready('burger')
  assert.ok(Math.abs(burger.dimensions.x - .12) < .001)
  assert.ok(burger.dimensions.y > .05 && burger.dimensions.y < .07)
  assert.equal(downloads.length, 1)
  await page.getByRole('button', { name: 'Girar automáticamente' }).click()
  assert.equal(await page.locator('model-viewer').evaluate(v => v.autoRotate), true)
  await page.getByRole('button', { name: 'Restablecer vista' }).click()
  assert.equal(await page.locator('model-viewer').evaluate(v => v.autoRotate), false)
  await page.locator('model-viewer').evaluate(v => { v.cameraOrbit = '390deg 150deg 105%'; v.jumpCameraToGoal() })
  const limit = await page.locator('model-viewer').evaluate(v => v.getCameraOrbit().phi)
  assert.ok(limit <= 85 * Math.PI / 180 + .001, 'Unscanned base must stay outside orbit limits')
  await page.getByRole('button', { name: 'Restablecer vista' }).click()
  await page.getByRole('button', { name: 'Por ingredientes', exact: true }).click()
  const exploded = await ready('exploded')
  assert.equal(exploded.animations.length, 1)
  assert.ok(exploded.duration > 0)
  assert.ok(exploded.time > .99)
  await page.getByRole('slider', { name: 'Separar ingredientes' }).fill('0')
  await page.waitForTimeout(250)
  assert.equal(await page.locator('model-viewer').evaluate(v => v.currentTime), 0)
  await page.locator('.model-section').screenshot({ path: 'artifacts/food/assembled.png' })
  await page.getByRole('slider', { name: 'Separar ingredientes' }).fill('100')
  for (const name of ['top-bun', 'tomato', 'egg', 'bottom-bun']) {
    await page.getByLabel('Mira de cerca', { exact: true }).selectOption(name)
    await ready(name)
    if (name === 'tomato') {
      await page.locator('model-viewer').evaluate(v => { v.cameraOrbit = '0deg 180deg 105%'; v.jumpCameraToGoal() })
      await page.waitForTimeout(400)
      await page.locator('.model-stage').screenshot({ path: 'artifacts/food/tomato-reverse.png' })
    }
  }
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    assert.equal(await page.getByRole('dialog').evaluate(el => el.scrollWidth > el.clientWidth), false, `Dialog overflow at ${width}`)
  }
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.activeElement?.tagName === 'BUTTON' && document.activeElement?.textContent?.trim() === 'Explorar en 3D')
  assert.equal(await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).evaluate(b => b === document.activeElement), true)
  await page.route('**/models/clean/*.glb*', route => route.abort())
  await page.reload()
  await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).click()
  await page.getByRole('heading', { name: 'No se pudo cargar la vista 3D.' }).waitFor()
  await page.unroute('**/models/clean/*.glb*')
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await ready('burger')
  assert.deepEqual(errors, [])
  console.log('PASS: lazy loading, mobile layout, scale, camera limits, rotation, four ingredients, exploded animation, slider, reverse view, focus and JS errors.')
} finally { await browser.close() }
