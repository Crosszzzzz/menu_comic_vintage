import { chromium } from 'playwright'

const base = process.env.PREVIEW_URL || 'http://localhost:4173'
const browser = await chromium.launch()

const shots = [
  { name: 'dark-menu-desktop', vp: { width: 1440, height: 1000 } },
  { name: 'dark-menu-mobile', vp: { width: 390, height: 844 } },
]

for (const { name, vp } of shots) {
  const page = await browser.newPage({ viewport: vp, colorScheme: 'dark' })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `artifacts/new-${name}.png`, fullPage: true })
  console.log('OK', name)
  await page.close()
}

// Info dialog (desktop, dark)
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /c.mo funciona/i }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'artifacts/new-info-dark.png' })
  console.log('OK info-dark')
  await page.close()
}

// 3D dialog (desktop, dark)
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Explorar en 3D' }).click()
  await page.waitForTimeout(4500)
  await page.screenshot({ path: 'artifacts/new-viewer-dark.png' })
  console.log('OK viewer-dark')
  await page.close()
}

await browser.close()
