import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
const recipe = process.argv[2] || 'scripts/recipes/egg-tomato.json'
const settings = JSON.parse(await readFile(recipe, 'utf8'))
if (!settings.source?.blend || !settings.manifest || !settings.seams || !settings.layers?.length) throw Error('Recipe is missing its scan, manifest, seam guides or layers.')
if (settings.source.texture) {
  await mkdir(settings.output,{recursive:true})
  await writeFile(`${settings.output}/reference-colors.rgb`, await sharp(settings.source.texture).resize(1024,1024).removeAlpha().raw().toBuffer())
}
async function run(command, args) {
  await new Promise((resolve,reject) => {
    const child = spawn(command,args,{stdio:'inherit'})
    child.on('error',reject)
    child.on('exit',code => code === 0 ? resolve() : reject(Error(`${command} exited with ${code}`)))
  })
}
await run('uv',['run','--with','mcp','python','scripts/blender-mcp-client.py','--script','scripts/mcp-build-reference-dish.py','--recipe',recipe])
await run(process.execPath,['scripts/optimize-dish.mjs',recipe])
