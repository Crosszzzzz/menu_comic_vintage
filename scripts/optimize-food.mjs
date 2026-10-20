import { NodeIO } from '@gltf-transform/core'
import { dedup, prune, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'

const io = new NodeIO()
await mkdir('public/models/clean', { recursive: true })
const geometry = JSON.parse(await readFile('artifacts/blender/geometry-report.json', 'utf8'))
const report = {}
for (const name of ['burger', 'bottom-bun', 'egg', 'tomato', 'top-bun', 'exploded']) {
  const doc = await io.read(`artifacts/blender/export/${name}.glb`)
  if (name === 'exploded') {
    const buffer = doc.getRoot().listBuffers()[0]
    const time = doc.createAccessor('Separation time', buffer).setType('SCALAR').setArray(new Float32Array([0, 1]))
    const animation = doc.createAnimation('Separar ingredientes')
    for (const node of doc.getRoot().listNodes()) {
      const { assembled_height, exploded_height } = node.getExtras()
      if (typeof assembled_height !== 'number') continue
      const translation = node.getTranslation()
      const output = doc.createAccessor(`${node.getName()} positions`, buffer).setType('VEC3').setArray(new Float32Array([
        translation[0], assembled_height, translation[2], translation[0], exploded_height, translation[2],
      ]))
      const sampler = doc.createAnimationSampler().setInput(time).setOutput(output).setInterpolation('LINEAR')
      animation.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('translation').setSampler(sampler))
    }
  }
  for (const mat of doc.getRoot().listMaterials()) mat.setMetallicFactor(0).setRoughnessFactor(.85).setDoubleSided(false)
  await doc.transform(dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: name === 'burger' ? [1536, 1536] : [1024, 1024], quality: 86 }))
  const path = `public/models/clean/${name}.glb`
  await io.write(path, doc)
  report[name] = { ...geometry[name], bytes: (await stat(path)).size, textureMax: name === 'burger' ? 1536 : 1024 }
}
await writeFile('public/models/clean/manifest.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
