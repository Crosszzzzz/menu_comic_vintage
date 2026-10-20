import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await page.goto(process.env.APP_URL || 'https://menu-comic-vintage.vercel.app')
  await page.getByRole('button', { name: 'Explorar en 3D', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded)
  const seen = new Set()
  for (const [angle, label] of [[35,'superior'],[90,'lateral'],[145,'inferior'],[180,'base']]) {
    await page.locator('.model-stage').scrollIntoViewIfNeeded()
    await page.locator('model-viewer').evaluate(async (v,angle) => {
      v.cameraOrbit = `0deg ${angle}deg 0.24m`
      await v.updateComplete
    },angle)
    await page.waitForTimeout(1000)
    const orbit = await page.locator('model-viewer').evaluate(v => v.getCameraOrbit())
    assert.ok(Math.abs(orbit.phi - angle*Math.PI/180) < .02, `Camera reaches ${angle} degrees: ${orbit.phi}`)
    assert.equal(await page.locator('model-viewer').evaluate(v => v.currentTime),0)
    await page.locator('.model-stage').screenshot({ path: `artifacts/closed/assembled-${label}.png` })
    const targets = await page.locator('model-viewer').evaluate(v => {
      const b=v.getBoundingClientRect(), groups={}
      for(let y=b.top+50; y<b.bottom-5; y+=3) for(let x=b.left+30; x<b.right-30; x+=5) {
        const mat=v.materialFromPoint(x,y)?.name
        const id=['top-bun','bottom-bun','egg','tomato'].find(id=>mat?.startsWith(id))
        if(id) (groups[id]??=[]).push({x,y})
      }
      return Object.fromEntries(Object.entries(groups).map(([id,p])=>[id,p[Math.floor(p.length/2)]]))
    })
    for(const [id,p] of Object.entries(targets)) {
      if(seen.has(id))continue
      await page.touchscreen.tap(p.x,p.y)
      const name={'top-bun':'Pan superior','bottom-bun':'Pan inferior',egg:'Huevo',tomato:'Tomate'}[id]
      await page.locator('.ingredient-card strong').getByText(name,{exact:true}).waitFor()
      await page.getByRole('button',{name:'Cerrar información del ingrediente'}).click()
      seen.add(id)
    }
    console.log(label,orbit.phi,Object.keys(targets))
  }
  assert.deepEqual([...seen].sort(),['bottom-bun','egg','tomato','top-bun'].sort())
  console.log('PASS: actual collapsed ingredient taps for all four types; camera reaches top, sides and 180-degree underside.')
} finally { await browser.close() }
