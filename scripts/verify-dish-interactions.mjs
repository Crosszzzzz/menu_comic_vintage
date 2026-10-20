import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

// The menu ships nine plain scanned desserts, so the layered viewer contract
// is exercised through a fixture instead of a product: the app is served a
// one-dish menu whose manifest still declares a clip and ingredient groups.
const dish = JSON.parse(await readFile('test-assets/layered-dish.json', 'utf8'))
dish.id = 'second-dish-fixture'
dish.name = 'Otro plato'
dish.viewer.labels.assemble = 'Juntar el plato'
dish.viewer.labels.explode = 'Explorar sus capas'
assert.ok(dish.viewer.ingredients.length >= 2, 'Fixture requires at least two source ingredient groups')
const firstPrefixes = dish.viewer.ingredients[0].materialPrefixes
const otherPrefixes = dish.viewer.ingredients.slice(1).flatMap(item => item.materialPrefixes)
dish.viewer.ingredients = [
  { id: 'custom-first-group', label: 'Primera capa', description: 'Nombre independiente de la geometría.', materialPrefixes: firstPrefixes },
  { id: 'custom-other-groups', label: 'Las otras capas', description: 'Varios materiales, un grupo configurable.', materialPrefixes: otherPrefixes },
]

const menuModule = `
const dish = ${JSON.stringify(dish)}
export const restaurant = { name: 'Botana', tagline: 'Café de barrio', claim: 'Café y repostería de la casa.', currency: 'BOB', locale: 'es-BO' }
export const categories = [{ label: dish.category, blurb: 'Fixture de prueba.', tone: 'peach' }]
export const dishes = [dish]
export const modelledCount = 1
export function formatPrice(price) {
  if (price === null) return 'Consulta el precio en barra'
  return new Intl.NumberFormat(restaurant.locale, { style: 'currency', currency: restaurant.currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)
}
export function categoryTone(label) { return categories.find(category => category.label === label)?.tone ?? 'sage' }
export function dishesOf(label) { return dishes.filter(item => item.category === label) }
`

const assembly = await readFile('test-assets/assembly.glb')
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })
  const errors = []
  const modelRequests = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (new URL(request.url()).pathname === dish.viewer.model) modelRequests.push(request.url()) })
  await page.route('**/src/data/menu.ts*', route => route.fulfill({ contentType: 'application/javascript', body: menuModule }))
  await page.route('**/models/test/assembly.glb*', route => route.fulfill({ contentType: 'model/gltf-binary', body: assembly }))
  await page.goto('http://127.0.0.1:5173')
  assert.equal(modelRequests.length, 0, 'GLB loads only after opening the viewer')
  await page.locator('[data-viewer-trigger]').click()
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded)
  await page.waitForTimeout(1000)
  assert.match(await page.locator('.product-info h2').innerText(), /Otro plato/)
  assert.equal(await page.locator('.sheet-cat').textContent(), dish.category)
  assert.equal(await page.locator('.ingredient-tags li').count(), dish.ingredients.length)
  assert.equal(await page.locator('model-viewer').evaluate(v => v.animationName), dish.viewer.animation.name)
  await page.locator('model-viewer').evaluate(v => { window.configTestViewer = v })
  const point = await page.locator('model-viewer').evaluate((v, prefixes) => {
    const b = v.getBoundingClientRect()
    for (let y = b.top + 75; y < b.bottom - 30; y += 8) for (let x = b.left + 20; x < b.right - 20; x += 8) {
      const name = v.materialFromPoint(x, y)?.name
      if (name && prefixes.some(prefix => name.startsWith(prefix))) return { x, y }
    }
  }, firstPrefixes)
  assert.ok(point, 'Raycast reaches a configured material')
  await page.mouse.move(point.x, point.y)
  await page.waitForTimeout(150)
  assert.match(await page.locator('.ingredient-hover').innerText(), /Primera capa/)
  await page.mouse.click(point.x, point.y)
  assert.equal(await page.locator('.ingredient-card strong').textContent(), 'Primera capa')
  await page.getByRole('button', { name: 'Explorar sus capas', exact: true }).click()
  await page.waitForTimeout(1300)
  assert.ok(await page.locator('model-viewer').evaluate(v => v.currentTime / v.duration > .99))
  assert.equal(await page.locator('model-viewer').evaluate(v => v === window.configTestViewer), true, 'Explode keeps the same viewer and model')
  assert.equal(modelRequests.length, 1, 'Explode does not fetch another model')
  await page.locator('model-viewer').evaluate(v => v.dispatchEvent(new Event('error')))
  await page.getByRole('button', { name: 'Reintentar', exact: false }).click()
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded)
  await page.waitForTimeout(1000)
  assert.ok(await page.locator('model-viewer').evaluate(v => v.currentTime / v.duration > .99), 'Retry preserves separation')
  assert.ok(Math.abs(await page.locator('model-viewer').evaluate(v => v.getCameraOrbit().radius) - dish.viewer.camera.exploded.radiusM) < .02, 'Retry restores the exploded framing')
  assert.equal(modelRequests.length, 2, 'Retry alone reloads the model')
  await page.getByRole('button', { name: 'Juntar el plato', exact: true }).click()
  await page.waitForTimeout(1300)
  assert.equal(await page.locator('model-viewer').evaluate(v => v.currentTime), 0)
  assert.equal(modelRequests.length, 2, 'Collapse still uses the same model')
  assert.deepEqual(errors, [])
  console.log('PASS: a substituted menu manifest changes headings, labels, clip, asset path and ingredient groups; picking, hover, explode and collapse all work without component changes.')
} finally { await browser.close() }
