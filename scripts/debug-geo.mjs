import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto('http://localhost:4173', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).click()
await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, null, { timeout: 60000 })
await page.waitForTimeout(1200)

const info = await page.evaluate(() => {
  const dialog = document.querySelector('.dish-dialog')
  const trigger = [...document.querySelectorAll('[data-slot="accordion-trigger"]')].find(b => b.textContent.includes('Tamaño'))
  const bar = document.querySelector('.ar-action')
  const stage = document.querySelector('.model-stage')
  const dcs = getComputedStyle(dialog)
  const snap = (label) => {
    const tr = trigger.getBoundingClientRect()
    const br = bar.getBoundingClientRect()
    const bcs = getComputedStyle(bar)
    return {
      label,
      triggerViewportTop: Math.round(tr.top),
      triggerCenterY: Math.round(tr.top + tr.height / 2),
      barViewportTop: Math.round(br.top),
      barPosition: bcs.position,
      clickableNow: (tr.top + tr.height / 2) < br.top && (tr.top + tr.height / 2) > 0,
    }
  }
  const before = snap('sin scroll')
  dialog.scrollTop = 99999
  const after = snap('max scroll')
  dialog.scrollTop = 0
  const dr = dialog.getBoundingClientRect()
  const sr = stage.getBoundingClientRect()
  return {
    viewport: { w: innerWidth, h: innerHeight },
    dialog: { rect: { top: dr.top, left: dr.left, w: dr.width, h: dr.height },
      position: dcs.position, top: dcs.top, translate: dcs.translate, transform: dcs.transform },
    stage: { top: sr.top, h: sr.height },
    scrollMax: after.label && (dialog.scrollHeight - dialog.clientHeight),
    before, after,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
