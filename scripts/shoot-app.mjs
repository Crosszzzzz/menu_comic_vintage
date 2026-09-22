import { chromium } from 'playwright'

const base = process.env.PREVIEW_URL || 'http://localhost:4173'
const browser = await chromium.launch()

const shots = [
  { name: 'menu-desktop', vp: { width: 1440, height: 1000 } },
  { name: 'menu-mobile', vp: { width: 390, height: 844 } },
]

for (const { name, vp } of shots) {
  const page = await browser.newPage({ viewport: vp })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `artifacts/new-${name}.png`, fullPage: true })
  console.log('OK', name)
  await page.close()
}

// Dialog 3D (desktop)
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Explorar en 3D' }).click()
  await page.waitForTimeout(4500)
  await page.screenshot({ path: 'artifacts/new-viewer-desktop.png' })
  console.log('OK viewer-desktop')
  await page.close()
}

// Info dialog (desktop)
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Cómo funciona' }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'artifacts/new-info-desktop.png' })
  console.log('OK info-desktop')
  await page.close()
}

await browser.close()
