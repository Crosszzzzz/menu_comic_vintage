import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const dir = path.resolve('design-previews')
const pages = ['1-modern-bistro.html', '2-editorial-refinado.html', '3-dark-premium.html']
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]

const browser = await chromium.launch()
for (const file of pages) {
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
    await page.goto(pathToFileURL(path.join(dir, file)).href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const out = path.join(dir, file.replace('.html', `-${vp.name}.png`))
    await page.screenshot({ path: out, fullPage: true })
    console.log('OK', out)
    await page.close()
  }
}
await browser.close()
