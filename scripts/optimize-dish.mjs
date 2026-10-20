import { NodeIO, PropertyType } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
const recipe = JSON.parse(await readFile(process.argv[2] || 'scripts/recipes/egg-tomato.json', 'utf8'))
const manifest = JSON.parse(await readFile(recipe.manifest, 'utf8'))
const report = JSON.parse(await readFile(`${recipe.output}/report.json`, 'utf8'))
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const output = dirname(`public${manifest.viewer.model}`)
await mkdir(output, { recursive: true })
for (const name of ['assembly', 'reference', ...Object.keys(report.parts)]) {
  const doc = await io.read(`${recipe.output}/${name}.glb`)
  if (name === 'assembly') {
    const buffer = doc.getRoot().listBuffers()[0]
    const input = doc.createAccessor('time', buffer).setType('SCALAR').setArray(new Float32Array([0, 1]))
    const animation = doc.createAnimation(manifest.viewer.animation.name)
    for (const node of doc.getRoot().listNodes()) {
      const { assembled_position: start, exploded_position: end } = node.getExtras()
      if (!start) continue
      const toGLTF = ([x,y,z]) => [x,z,-y]
      const output = doc.createAccessor(node.getName(), buffer).setType('VEC3').setArray(new Float32Array([...toGLTF(start),...toGLTF(end)]))
      const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR')
      animation.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('translation').setSampler(sampler))
    }
  }
  await doc.transform(dedup({ propertyTypes: [PropertyType.ACCESSOR,PropertyType.TEXTURE,PropertyType.MESH] }),prune(),textureCompress({encoder:sharp,targetFormat:'jpeg',resize:[2048,2048],quality:90}))
  await io.write(`${output}/${name}.glb`,doc)
  console.log(name,(await stat(`${output}/${name}.glb`)).size)
}
await writeFile(`${output}/geometry-report.json`,JSON.stringify(report,null,2))
