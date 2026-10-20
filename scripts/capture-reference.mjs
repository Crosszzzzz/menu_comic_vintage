import {chromium} from 'playwright'
import {mkdir} from 'node:fs/promises'
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']})
await mkdir('artifacts/reference-view',{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1400,height:1100}})
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5173')
 await page.getByRole('button',{name:'Explorar en 3D',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('model-viewer')?.loaded)
 for(const [name,phi,theta] of [['assembled',78,30],['front',90,0],['bottom',160,0]]){
  await page.locator('model-viewer').evaluate(async(v,{phi,theta})=>{v.cameraOrbit=`${theta}deg ${phi}deg .3m`;await v.updateComplete;v.jumpCameraToGoal()},{phi,theta})
  await page.waitForTimeout(700)
  await page.locator('.model-stage').screenshot({path:`artifacts/reference-view/${name}.png`})
 }
 await page.getByRole('button',{name:'Separar ingredientes',exact:true}).click();await page.waitForTimeout(1400)
 await page.locator('.model-stage').screenshot({path:'artifacts/reference-view/exploded.png'})
 await page.locator('model-viewer').evaluate(async v=>{v.cameraOrbit='30deg 120deg .52m';await v.updateComplete;v.jumpCameraToGoal()})
 await page.waitForTimeout(700)
 await page.locator('.model-stage').screenshot({path:'artifacts/reference-view/exploded-bottom.png'})
 console.log('Captured reference assembly/explosion')
}finally{await browser.close()}
