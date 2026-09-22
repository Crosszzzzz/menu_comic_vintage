import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.env.APP_URL || 'http://localhost:4173'
console.log('BASE', base)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))

await page.goto(base, { waitUntil: 'networkidle' })

// Open 3D dialog
const trigger = page.getByRole('button', { name: 'Explorar en 3D', exact: true })
await trigger.click()
await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, null, { timeout: 60000 })

// Accordion "Tamaño del plato"
await page.getByRole('button', { name: 'Tamaño del plato' }).click()
await page.getByText(/Aproximadamente 12 cm/).waitFor({ timeout: 10000 })
console.log('OK accordion tamaño')

// Accordion "Ingredientes y alérgenos" del visor
await page.getByRole('button', { name: 'Ingredientes y alérgenos' }).click()
await page.getByText(/Contiene huevo y pan/).waitFor({ timeout: 10000 })
console.log('OK accordion ingredientes')

// Rotate/reset
await page.getByRole('button', { name: 'Girar automáticamente' }).click()
assert.equal(await page.locator('model-viewer').evaluate(v => v.autoRotate), true)
await page.getByRole('button', { name: 'Restablecer vista' }).click()
assert.equal(await page.locator('model-viewer').evaluate(v => v.autoRotate), false)
console.log('OK rotar/restablecer')

// Escape devuelve foco al trigger
await page.keyboard.press('Escape')
assert.equal(await trigger.evaluate(b => b === document.activeElement), true)
console.log('OK foco restaurado')

// Diálogo info abre y cierra
await page.getByRole('button', { name: 'Cómo funciona' }).click()
await page.getByRole('heading', { name: 'Primero mira. Luego disfruta.' }).waitFor()
await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
console.log('OK info dialog')

// Acordeón de la carta (menú principal)
await page.getByRole('button', { name: 'Ingredientes y alérgenos' }).click()
await page.getByText(/contaminación cruzada/).waitFor({ timeout: 10000 })
console.log('OK acordeón de la carta')

// Sin overflow en los 4 anchos
for (const width of [320, 390, 768, 1440]) {
  await page.setViewportSize({ width, height: 900 })
  await page.waitForTimeout(200)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}px`)
}
console.log('OK sin overflow 320/390/768/1440')

assert.deepEqual(errors, [])
console.log('PASS ALL')
await browser.close()
