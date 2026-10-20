import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, simplify, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { chromium } from 'playwright'

/**
 * Compresses the scanned dessert models into phone-sized assets.
 *
 * - One draw-friendly GLB per product, textures capped at 1024 px (JPEG unless
 *   the source actually needs an alpha channel).
 * - Geometry simplified to a phone budget while keeping the silhouette.
 * - The model is recentred on X/Z, rests on Y = 0 and is scaled to its real
 *   size in metres, so AR places a life-size dessert on the table.
 * - The iOS Quick Look USDZ is generated from that same scaled GLB, so Android
 *   (GLB) and iOS (USDZ) show the exact same product at the exact same size.
 */

const config = JSON.parse(await readFile('scripts/desserts.json', 'utf8'))
const only = process.argv[2]
const entries = only ? config.filter(entry => entry.slug === only) : config
const sourceDir = 'public/models/postres'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
await MeshoptSimplifier.ready

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 })
await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173')
// The viewer module is lazy-loaded: open the modelled product once so the
// custom element is registered, then reuse it for every export.
await page.locator('[data-viewer-trigger]').click()
await page.waitForFunction(() => !!customElements.get('model-viewer'), null, { timeout: 60_000 })

function worldBounds(doc) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  const multiply = (a, b) => {
    const out = new Array(16).fill(0)
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
    return out
  }
  const localMatrix = node => {
    const [x, y, z, w] = node.getRotation()
    const [sx, sy, sz] = node.getScale()
    const [tx, ty, tz] = node.getTranslation()
    const x2 = x + x, y2 = y + y, z2 = z + z
    const xx = x * x2, xy = x * y2, xz = x * z2
    const yy = y * y2, yz = y * z2, zz = z * z2
    const wx = w * x2, wy = w * y2, wz = w * z2
    return [
      (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
      (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
      (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
      tx, ty, tz, 1,
    ]
  }
  const visit = (node, parent) => {
    const world = multiply(parent, localMatrix(node))
    const mesh = node.getMesh()
    if (mesh) for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION')
      if (!position) continue
      const value = [0, 0, 0]
      for (let i = 0; i < position.getCount(); i++) {
        position.getElement(i, value)
        const point = [0, 0, 0]
        for (let r = 0; r < 3; r++) point[r] = world[r] * value[0] + world[4 + r] * value[1] + world[8 + r] * value[2] + world[12 + r]
        for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], point[a]); max[a] = Math.max(max[a], point[a]) }
      }
    }
    for (const child of node.listChildren()) visit(child, world)
  }
  for (const node of doc.getRoot().listScenes()[0].listChildren()) visit(node, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  return { min, max, dims: [0, 1, 2].map(axis => max[axis] - min[axis]) }
}

const results = []
for (const entry of entries) {
  const input = `${sourceDir}/${entry.source}`
  const outputDir = `public/models/${entry.slug}`
  await mkdir(outputDir, { recursive: true })
  await mkdir('public/images', { recursive: true })

  const originalSize = (await stat(input)).size
  const doc = await io.read(input)
  const root = doc.getRoot()

  for (const animation of root.listAnimations()) animation.dispose()
  for (const camera of root.listCameras()) camera.dispose()

  const triangleCount = () => root.listMeshes().reduce((total, mesh) => total + mesh.listPrimitives().reduce((sum, prim) => {
    const indices = prim.getIndices()
    return sum + (indices ? indices.getCount() : (prim.getAttribute('POSITION')?.getCount() ?? 0)) / 3
  }, 0), 0)
  const before = triangleCount()

  let hasAlpha = false
  for (const texture of root.listTextures()) {
    const image = texture.getImage()
    if (!image) continue
    const meta = await sharp(Buffer.from(image)).metadata()
    if (meta.hasAlpha && texture.getMimeType() === 'image/png') hasAlpha = true
  }

  // Scanned assets arrive either as spec/gloss or as unlit bakes. model-viewer
  // cannot render spec/gloss at all (white models) and Quick Look cannot export
  // unlit materials to USDZ. Normalize both to a plain, non-metallic standard
  // material so the dessert looks lit on every platform and exports cleanly.
  for (const material of root.listMaterials()) {
    const specGloss = material.getExtension('KHR_materials_pbrSpecularGlossiness')
    if (specGloss) {
      const diffuse = specGloss.getDiffuseTexture()
      if (diffuse) {
        material.setBaseColorTexture(diffuse)
        material.getBaseColorTextureInfo()?.copy(specGloss.getDiffuseTextureInfo())
      }
      material.setBaseColorFactor(specGloss.getDiffuseFactor())
      material.setRoughnessFactor(0.8)
      material.setExtension('KHR_materials_pbrSpecularGlossiness', null)
    } else {
      material.setExtension('KHR_materials_unlit', null)
      material.setRoughnessFactor(0.9)
    }
    material.setMetallicFactor(0)
  }
  for (const extension of root.listExtensionsUsed()) {
    const name = extension.extensionName
    if (!['KHR_materials_unlit', 'KHR_materials_pbrSpecularGlossiness'].includes(name)) continue
    if (!root.listMaterials().some(material => material.getExtension(name))) extension.dispose()
  }

  await doc.transform(
    dedup(),
    prune(),
    weld({ tolerance: 0.0001 }),
    textureCompress({
      encoder: sharp,
      targetFormat: hasAlpha ? 'png' : 'jpeg',
      resize: [1024, 1024],
      quality: 82,
    }),
  )

  const afterTexture = triangleCount()
  try {
    await doc.transform(simplify({
      simplifier: MeshoptSimplifier,
      ratio: Math.min(1, entry.tris / afterTexture),
      error: 0.005,
    }))
  } catch (error) {
    console.warn(`  simplify skipped for ${entry.slug}: ${error.message}`)
  }

  // Real size in metres, centred on X/Z and resting on the floor.
  const bounds = worldBounds(doc)
  const scale = (entry.widthCm / 100) / Math.max(bounds.dims[0], bounds.dims[2])
  const centerX = (bounds.min[0] + bounds.max[0]) / 2
  const centerZ = (bounds.min[2] + bounds.max[2]) / 2
  const wrapper = doc.createNode(`${entry.slug}-scale`)
    .setScale([scale, scale, scale])
    .setTranslation([-centerX * scale, -bounds.min[1] * scale, -centerZ * scale])
  for (const node of root.listScenes()[0].listChildren()) wrapper.addChild(node)
  root.listScenes()[0].addChild(wrapper)

  const glbPath = `${outputDir}/model.glb`
  await io.write(glbPath, doc)
  const glbSize = (await stat(glbPath)).size
  const scaled = { widthCm: 0, heightCm: 0, depthCm: 0 }
  {
    const dims = [bounds.dims[0] * scale * 100, bounds.dims[1] * scale * 100, bounds.dims[2] * scale * 100]
    scaled.widthCm = +dims[0].toFixed(1)
    scaled.heightCm = +dims[1].toFixed(1)
    scaled.depthCm = +dims[2].toFixed(1)
  }

  // Same viewer settings as the app, so the poster and the USDZ match what the
  // visitor sees in 3D and in AR.
  await page.evaluate(async ({ src }) => {
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    document.body.style.backgroundImage = 'none'
    document.body.replaceChildren()
    const viewer = document.createElement('model-viewer')
    viewer.id = 'export-viewer'
    viewer.src = src
    viewer.setAttribute('environment-image', 'neutral')
    viewer.setAttribute('shadow-intensity', '.8')
    viewer.setAttribute('shadow-softness', '1')
    viewer.setAttribute('exposure', '1.05')
    viewer.setAttribute('ar', '')
    viewer.setAttribute('ar-scale', 'fixed')
    viewer.style.cssText = 'width:1000px;height:900px;background:transparent;--poster-color:transparent;'
    // Hide the built-in slots that are not part of the app experience.
    const progress = document.createElement('span')
    progress.slot = 'progress-bar'
    progress.hidden = true
    const arButton = document.createElement('span')
    arButton.slot = 'ar-button'
    arButton.hidden = true
    viewer.append(progress, arButton)
    document.body.append(viewer)
  }, { src: `/models/${entry.slug}/model.glb` })
  await page.waitForFunction(() => document.querySelector('#export-viewer')?.loaded, null, { timeout: 120_000 })

  await page.evaluate(async () => {
    const viewer = document.querySelector('#export-viewer')
    viewer.cameraOrbit = '30deg 72deg 105%'
    viewer.fieldOfView = '30deg'
    viewer.jumpCameraToGoal()
    await new Promise(resolve => setTimeout(resolve, 1200))
  })
  const shot = await page.locator('#export-viewer').screenshot({ omitBackground: true })
  // Trim to the solid product (alpha > 96) and add a small margin for the
  // contact shadow. A plain trim() follows the faint shadow and leaves the
  // dessert too small inside the card.
  const { data, info } = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] <= 96) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  const margin = Math.round(Math.max(maxX - minX, maxY - minY) * 0.09)
  const crop = {
    left: Math.max(0, minX - margin),
    top: Math.max(0, minY - margin),
    width: Math.min(info.width, maxX + 1 + margin) - Math.max(0, minX - margin),
    height: Math.min(info.height, maxY + 1 + margin) - Math.max(0, minY - margin),
  }
  const poster = await sharp(shot)
    .extract(crop)
    .resize(1060, 880, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 60, bottom: 60, left: 70, right: 70, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 88 })
    .toBuffer()
  await writeFile(`public/images/${entry.slug}.webp`, poster)

  const base64 = await page.evaluate(async () => {
    const viewer = document.querySelector('#export-viewer')
    const url = await viewer.prepareUSDZ()
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
  const usdz = Buffer.from(base64, 'base64')
  await writeFile(`${outputDir}/model.usdz`, usdz)

  const result = {
    slug: entry.slug,
    sourceMB: +(originalSize / 1048576).toFixed(2),
    glbMB: +(glbSize / 1048576).toFixed(2),
    usdzMB: +(usdz.length / 1048576).toFixed(2),
    trisBefore: Math.round(before),
    trisAfter: Math.round(triangleCount()),
    textures: hasAlpha ? 'png' : 'jpeg',
    sizeCm: scaled,
  }
  results.push(result)
  console.log(JSON.stringify(result))
}

await browser.close()
console.log('\n' + JSON.stringify(results, null, 2))

