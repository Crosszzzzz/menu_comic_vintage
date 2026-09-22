import { mkdir, writeFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import obj2gltf from 'obj2gltf'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, getBounds, prune, simplify, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'public/models')
const measuredWidthMeters = 0.12

await mkdir(output, { recursive: true })
await MeshoptSimplifier.ready

const source = await obj2gltf(path.join(root, 'Hamburguesa_De_Huevo.obj'), {
  binary: true,
  secure: true,
  inputUpAxis: 'Y',
  outputUpAxis: 'Y',
})
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const document = await io.readBinary(source)
const scene = document.getRoot().listScenes()[0]
if (!scene) throw new Error('The source model has no scene.')

const original = getBounds(scene)
// One measured dimension defines a uniform scale: never distort the scan to fit
// the approximate height. glTF lengths are meters, including in native AR.
const sourceWidth = original.max[0] - original.min[0]
const scale = measuredWidthMeters / sourceWidth
const calibratedRoot = document.createNode('Measured 12 cm sandwich')
for (const child of scene.listChildren()) calibratedRoot.addChild(child)
scene.addChild(calibratedRoot)
calibratedRoot.setScale([scale, scale, scale])
calibratedRoot.setTranslation([
  -(original.min[0] + original.max[0]) * scale / 2,
  -original.min[1] * scale,
  -(original.min[2] + original.max[2]) * scale / 2,
])

for (const material of document.getRoot().listMaterials()) {
  material.setMetallicFactor(0).setRoughnessFactor(0.92)
}

await document.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.3, error: 0.001 }),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [2048, 2048], quality: 88 }),
)

const bounds = getBounds(scene)
const dimensions = bounds.max.map((value, i) => value - bounds.min[i])
const file = path.join(output, 'egg-tomato.glb')
await io.write(file, document)
const triangles = document.getRoot().listMeshes().reduce((total, mesh) =>
  total + mesh.listPrimitives().reduce((sum, primitive) =>
    sum + (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount()) / 3, 0), 0)

const manifest = {
  source: 'Hamburguesa_De_Huevo.obj',
  measurement: { widthCm: 12, approximateHeightCm: 6, uniformScale: true },
  dimensionsMeters: { width: dimensions[0], height: dimensions[1], depth: dimensions[2] },
  triangles,
  bytes: (await stat(file)).size,
  textureResolution: 2048,
}
await writeFile(path.join(output, 'egg-tomato.meta.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify(manifest, null, 2))
