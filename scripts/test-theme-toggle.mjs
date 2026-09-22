import { chromium } from 'playwright'

const BASE = process.env.THEME_TEST_URL || 'http://localhost:5174/'
const results = []
const check = (name, ok) => {
  results.push([name, ok])
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`)
}

const browser = await chromium.launch()

// 1) Primera visita con sistema claro → arranca en claro y el botón existe
const ctx1 = await browser.newContext({ colorScheme: 'light' })
const p1 = await ctx1.newPage()
await p1.goto(BASE, { waitUntil: 'load', timeout: 30000 })
await p1.waitForSelector('#theme-toggle', { timeout: 15000 })
check('sistema claro → inicia en claro', !(await p1.evaluate(() => document.documentElement.classList.contains('dark'))))
check('botón visible en la cabecera', await p1.isVisible('#theme-toggle'))

// 2) Click → oscuro y persiste al recargar
await p1.click('#theme-toggle')
check('click → activa oscuro', await p1.evaluate(() => document.documentElement.classList.contains('dark')))
await p1.reload({ waitUntil: 'load', timeout: 30000 })
await p1.waitForSelector('#theme-toggle', { timeout: 15000 })
check('persiste oscuro tras recargar', await p1.evaluate(() => document.documentElement.classList.contains('dark')))

// 3) Segundo click → claro y persiste
await p1.click('#theme-toggle')
check('segundo click → vuelve a claro', !(await p1.evaluate(() => document.documentElement.classList.contains('dark'))))
await p1.reload({ waitUntil: 'load', timeout: 30000 })
await p1.waitForSelector('#theme-toggle', { timeout: 15000 })
check('persiste claro tras recargar', !(await p1.evaluate(() => document.documentElement.classList.contains('dark'))))

// 4) Primera visita con sistema oscuro → arranca en oscuro
const ctx2 = await browser.newContext({ colorScheme: 'dark' })
const p2 = await ctx2.newPage()
await p2.goto(BASE, { waitUntil: 'load', timeout: 30000 })
await p2.waitForSelector('#theme-toggle', { timeout: 15000 })
check('sistema oscuro → inicia en oscuro', await p2.evaluate(() => document.documentElement.classList.contains('dark')))

await browser.close()
const failed = results.filter(([, ok]) => !ok).length
console.log(failed ? `FAIL: ${failed}/${results.length}` : `PASS ALL ${results.length}/${results.length}`)
process.exit(failed ? 1 : 0)
