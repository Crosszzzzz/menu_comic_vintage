import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'
const dish = JSON.parse(await readFile(process.argv[2] || 'src/data/dishes/egg-tomato.json', 'utf8'))

const output = fileURLToPath(new URL('../public/images/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 })
  await page.goto(process.env.APP_URL || 'http://localhost:5173')
  await page.locator('[data-viewer-trigger]').click()
  await page.waitForFunction(() => !!customElements.get('model-viewer'), null, { timeout: 60_000 })
  await page.evaluate(dish => {
    const viewer = document.createElement('model-viewer')
    viewer.src = dish.viewer.model
    viewer.setAttribute('environment-image', 'neutral')
    viewer.setAttribute('shadow-intensity', '.8')
    viewer.setAttribute('exposure', '1.05')
    viewer.style.cssText = 'width:100%;height:900px;'
    document.body.replaceChildren(viewer)
  }, dish)
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, null, { timeout: 60_000 })
  const bytes = await page.evaluate(async (pose) => {
    const viewer = document.querySelector('model-viewer')
    viewer.cameraOrbit = `${pose.thetaDeg}deg ${pose.phiDeg}deg 105%`
    viewer.jumpCameraToGoal()
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const blob = await viewer.toBlob({ mimeType: 'image/png', idealAspect: false })
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  }, dish.viewer.camera.assembled)
  const image = await sharp(Buffer.from(bytes)).resize(1200, 1000, { fit: 'contain', background: '#00000000' }).webp({ quality: 88 }).toBuffer()
  await writeFile(`public${dish.poster}`, image)
  console.log(`Rendered poster: ${Math.round(image.length / 1024)} KiB`)
} finally {
  await browser.close()
}
