import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

await mkdir('artifacts/organic', { recursive: true })

// Ingredient hover only exists when a manifest declares ingredient groups.
// The shipped menu is made of single-mesh desserts, so this test serves the
// app the layered fixture and its model instead of adding a fake product.
const dish = JSON.parse(await readFile('test-assets/layered-dish.json', 'utf8'))
const menuModule = `
const dish = ${JSON.stringify(dish)}
export const restaurant = { name: 'Botana', tagline: 'Café de barrio', claim: 'Café y repostería de la casa.', currency: 'BOB', locale: 'es-BO' }
export const categories = [{ label: dish.category, blurb: 'Fixture de prueba.', tone: 'peach' }]
export const dishes = [dish]
export const modelledCount = 1
export function formatPrice(price) {
  return new Intl.NumberFormat(restaurant.locale, { style: 'currency', currency: restaurant.currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)
}
export function categoryTone(label) { return categories.find(category => category.label === label)?.tone ?? 'sage' }
export function dishesOf(label) { return dishes.filter(item => item.category === label) }
`
const assembly = await readFile('test-assets/assembly.glb')

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/src/data/menu.ts*', route => route.fulfill({ contentType: 'application/javascript', body: menuModule }))
  await page.route('**/models/test/assembly.glb*', route => route.fulfill({ contentType: 'model/gltf-binary', body: assembly }))
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173')
  await page.locator('[data-viewer-trigger]').click()
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded)
  await page.waitForTimeout(1200)
  const original = await page.locator('model-viewer').evaluate(v => v.model.materials.map(m => [...m.emissiveFactor]))
  for (const expanded of [false, true]) {
    if (expanded) {
      await page.getByRole('button', { name: 'Separar ingredientes', exact: true }).click()
      await page.waitForTimeout(1600)
    }
    const points = await page.locator('model-viewer').evaluate(v => {
      const b = v.getBoundingClientRect(), points = {}
      for (let y = b.top + 65; y < b.bottom - 45; y += 4) {
        for (let x = b.left + 20; x < b.right - 20; x += 4) {
          const name = v.materialFromPoint(x, y)?.name
          const id = ['top-bun', 'bottom-bun', 'egg', 'tomato'].find(id => name?.startsWith(id))
          if (id) (points[id] ??= []).push({ x, y })
        }
      }
      return Object.fromEntries(Object.entries(points).map(([id, list]) => [id, list[Math.floor(list.length / 2)]]))
    })
    if (expanded) assert.equal(Object.keys(points).length, 4)
    for (const [id, point] of Object.entries(points)) {
      await page.mouse.move(point.x, point.y)
      await page.waitForTimeout(160)
      assert.equal(await page.locator('.ingredient-hover').count(), 1, `Hover visible: ${id}`)
      assert.equal(await page.locator('model-viewer').evaluate(v => getComputedStyle(v.shadowRoot.querySelector('.userInput')).cursor), 'pointer')
      const changed = await page.locator('model-viewer').evaluate((v, id) => v.model.materials.filter(m => m.name.startsWith(id)).every(m => m.emissiveFactor[0] > .15), id)
      assert.ok(changed, `Ingredient highlighted: ${id}`)
      await page.locator('.product-stage').screenshot({ path: `artifacts/organic/${expanded ? 'exploded' : 'assembled'}-hover-${id}.png` })
      await page.mouse.click(point.x, point.y)
      await page.locator('.ingredient-card').waitFor()
      await page.getByRole('button', { name: 'Cerrar información del ingrediente' }).click()
      await page.mouse.move(10, 10)
      assert.equal(await page.locator('.ingredient-hover').count(), 0)
      assert.deepEqual(await page.locator('model-viewer').evaluate(v => v.model.materials.map(m => [...m.emissiveFactor])), original, 'Restore every original material')
    }
    const point = points['top-bun']
    await page.mouse.move(point.x, point.y)
    await page.mouse.down()
    await page.mouse.move(point.x + 55, point.y + 25, { steps: 6 })
    await page.mouse.up()
    assert.equal(await page.locator('.ingredient-hover').count(), 0, 'Dragging clears hover')
    assert.equal(await page.locator('.ingredient-card').count(), 0, 'Dragging does not select')
    await page.getByRole('button', { name: 'Restablecer vista', exact: true }).click()
    await page.waitForTimeout(700)
  }
  assert.deepEqual(errors, [])
  console.log('PASS: desktop hover highlights real raycast targets, pointer cursor, labels, selection, restoration, drag exclusion in assembled and exploded views.')
} finally { await browser.close() }
