import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const output = fileURLToPath(new URL('../public/images/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 })
  await page.goto(process.env.APP_URL || 'http://localhost:5173')
  await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, null, { timeout: 60_000 })
  const bytes = await page.evaluate(async () => {
    const viewer = document.querySelector('model-viewer')
    viewer.cameraOrbit = '30deg 72deg 105%'
    viewer.jumpCameraToGoal()
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const blob = await viewer.toBlob({ mimeType: 'image/png', idealAspect: false })
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  const image = await sharp(Buffer.from(bytes)).resize(1200, 1000, { fit: 'contain', background: '#00000000' }).webp({ quality: 88 }).toBuffer()
  await writeFile(new URL('../public/images/egg-tomato.webp', import.meta.url), image)
  console.log(`Rendered poster: ${Math.round(image.length / 1024)} KiB`)
} finally {
  await browser.close()
}
