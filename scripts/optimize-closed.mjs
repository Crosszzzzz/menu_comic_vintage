import { NodeIO, PropertyType } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'
import { mkdir, stat, writeFile } from 'node:fs/promises'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
await mkdir('public/models/v3', { recursive: true })
const report = {}
for (const name of ['assembly', 'top-bun', 'bottom-bun', 'egg', 'tomato']) {
  const doc = await io.read(`artifacts/blender/export-v2/${name}.glb`)
  if (name === 'assembly') {
    const buffer = doc.getRoot().listBuffers()[0]
    const input = doc.createAccessor('time', buffer).setType('SCALAR').setArray(new Float32Array([0, 1]))
    const animation = doc.createAnimation('Separar ingredientes')
    for (const node of doc.getRoot().listNodes()) {
      const { assembled_position: start, exploded_position: end } = node.getExtras()
      if (!start) continue
      const toGLTF = ([x, y, z]) => [x, z, -y]
      const output = doc.createAccessor(node.getName(), buffer).setType('VEC3').setArray(new Float32Array([...toGLTF(start), ...toGLTF(end)]))
      const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR')
      animation.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('translation').setSampler(sampler))
    }
  }
  await doc.transform(dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.TEXTURE, PropertyType.MESH] }), prune(), textureCompress({ encoder: sharp, slots: /baseColorTexture/, targetFormat: 'jpeg', resize: [1024, 1024], quality: 88 }), textureCompress({ encoder: sharp, slots: /normalTexture/, targetFormat: 'png', resize: [512, 512] }))
  const path = `public/models/v3/${name}.glb`
  await io.write(path, doc)
  report[name] = { bytes: (await stat(path)).size, nodes: doc.getRoot().listNodes().map(n => n.getName()), textures: doc.getRoot().listTextures().length }
}
await writeFile('public/models/v3/manifest.json', JSON.stringify(report, null, 2))
console.log(report)
