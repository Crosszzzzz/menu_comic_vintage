import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
try {
  const page = await browser.newPage()
  await page.goto(process.env.APP_URL || 'http://localhost:5173')
  await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, null, { timeout: 60000 })
  const data = await page.evaluate(async () => {
    const url = await document.querySelector('model-viewer').prepareUSDZ()
    const blob = await (await fetch(url)).blob()
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    URL.revokeObjectURL(url)
    return base64
  })
  await writeFile(new URL('../public/models/egg-tomato.usdz', import.meta.url), Buffer.from(data, 'base64'))
  console.log('Archivo USDZ de iPhone generado.')
} finally {
  await browser.close()
}
