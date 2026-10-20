import { chromium } from 'playwright'
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
const dish = JSON.parse(await readFile(process.argv[2] || 'src/data/dishes/egg-tomato.json', 'utf8'))

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  for (const state of ['assembled', 'exploded']) {
    const page = await browser.newPage({ viewport: { width: 800, height: 900 } })
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173')
    await page.locator('[data-viewer-trigger]').click()
    await page.waitForFunction(() => !!customElements.get('model-viewer'), null, { timeout: 60_000 })
    // Reuse the loaded web component, then export the requested manifest's model
    // independently of which dish happens to be featured on the menu homepage.
    await page.evaluate(dish => {
      const v = document.createElement('model-viewer')
      v.src = dish.viewer.model; v.animationName = dish.viewer.animation.name
      v.setAttribute('environment-image', 'neutral'); v.setAttribute('ar', '')
      v.style.cssText = 'width:800px;height:900px;'
      document.body.replaceChildren(v)
    }, dish)
    await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded)
    await page.locator('model-viewer').evaluate((v, state) => {
      v.play({repetitions:1,pingpong:false}); v.pause()
      v.currentTime = state === 'exploded' ? v.duration * .999999 : 0
    }, state)
    await page.waitForTimeout(500)
    const base64 = await page.locator('model-viewer').evaluate(async v => {
      const url = await v.prepareUSDZ()
      const blob = await (await fetch(url)).blob()
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      URL.revokeObjectURL(url)
      return data
    })
    const bytes = Buffer.from(base64, 'base64')
    const path = `public${dish.viewer.ios[state]}`
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, bytes)
    console.log(`${state}: ${bytes.length} bytes`)
    await page.close()
  }
} finally { await browser.close() }
