import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const artKeys = new Set(['cup', 'cortado', 'latte', 'glass', 'iced', 'lemonade', 'pastry', 'roll', 'brownie', 'toast', 'sandwich'])

function validateDish(dish, label = dish.id, { checkFiles = true } = {}) {
  for (const key of ['id', 'name', 'category', 'description', 'art', 'allergenNote']) {
    assert.equal(typeof dish[key], 'string', `${label}: ${key} must be text`)
    assert.ok(dish[key].trim(), `${label}: ${key} cannot be empty`)
  }
  assert.ok(artKeys.has(dish.art), `${label}: unknown art key ${dish.art}`)
  assert.ok(dish.price === null || (Number.isFinite(dish.price) && dish.price >= 0), `${label}: invalid price`)
  assert.ok(Array.isArray(dish.ingredients) && dish.ingredients.length > 0, `${label}: ingredients required`)

  // A dish without a viewer is a valid menu product: the card falls back to
  // its comic art and the sheet omits 3D/AR controls.
  if (!dish.viewer) return

  const viewer = dish.viewer
  assert.ok(dish.dimensions, `${label}: modelled dishes declare real dimensions for AR`)
  assert.ok(dish.dimensions.widthCm > 0 && dish.dimensions.heightCm > 0, `${label}: dimensions must be positive`)
  if (dish.dimensions.depthCm !== undefined) assert.ok(dish.dimensions.depthCm > 0, `${label}: invalid depth`)

  assert.match(viewer.model, /^\/models\/.+\.glb$/, `${label}: model path`)
  if (checkFiles) assert.ok(existsSync(`public${viewer.model}`), `${label}: missing ${viewer.model}`)
  assert.match(viewer.ios.assembled, /^\/models\/.+\.usdz$/, `${label}: assembled USDZ path`)
  if (checkFiles) assert.ok(existsSync(`public${viewer.ios.assembled}`), `${label}: missing ${viewer.ios.assembled}`)
  if (viewer.ios.exploded) {
    assert.match(viewer.ios.exploded, /^\/models\/.+\.usdz$/)
    assert.notEqual(viewer.ios.exploded, viewer.ios.assembled)
  }
  assert.ok(viewer.alt.trim(), `${label}: alt text required`)
  assert.ok(viewer.labels.assembledCaption.trim(), `${label}: assembled caption required`)
  assert.ok(dish.poster, `${label}: modelled dishes need a poster`)
  if (checkFiles) assert.ok(existsSync(`public${dish.poster}`), `${label}: missing ${dish.poster}`)

  // Layered models are optional: only validate the explode contract when the
  // manifest declares it, so a plain scanned dessert needs no fake animation.
  if (viewer.animation) {
    assert.ok(viewer.animation.name.trim(), `${label}: animation name required`)
    assert.ok(Number.isFinite(viewer.animation.transitionMs) && viewer.animation.transitionMs > 0, `${label}: transition required`)
    assert.ok(viewer.labels.explode?.trim() && viewer.labels.assemble?.trim(), `${label}: explode labels required`)
    assert.notEqual(viewer.labels.assemble, viewer.labels.explode)
  }

  if (viewer.camera) {
    const { camera } = viewer
    assert.ok(camera.minRadiusM > 0 && camera.maxRadiusM > camera.minRadiusM, `${label}: camera radius range`)
    assert.ok(camera.fieldOfViewDeg > 0 && camera.fieldOfViewDeg < 180, `${label}: field of view`)
    for (const state of ['assembled', 'exploded']) {
      const pose = camera[state]
      if (!pose) continue
      assert.ok(Number.isFinite(pose.thetaDeg), `${label}: ${state} theta`)
      assert.ok(pose.phiDeg >= 0 && pose.phiDeg <= 180, `${label}: ${state} phi`)
      assert.ok(pose.radiusM >= camera.minRadiusM && pose.radiusM <= camera.maxRadiusM, `${label}: ${state} radius`)
      assert.equal(pose.targetM.length, 3, `${label}: ${state} target`)
      assert.ok(pose.targetM.every(Number.isFinite), `${label}: ${state} target values`)
    }
    assert.ok(camera.exploded, `${label}: a layered camera needs an exploded pose`)
  }

  const ids = new Set(), prefixes = new Set()
  for (const ingredient of viewer.ingredients ?? []) {
    assert.ok(ingredient.id && !ids.has(ingredient.id), `${label}: duplicate or empty ingredient id ${ingredient.id}`)
    ids.add(ingredient.id)
    assert.ok(ingredient.label.trim() && ingredient.description.trim())
    assert.ok(ingredient.materialPrefixes.length > 0)
    for (const prefix of ingredient.materialPrefixes) {
      assert.ok(prefix && !prefixes.has(prefix), `${label}: duplicate or empty material prefix ${prefix}`)
      prefixes.add(prefix)
    }
  }
}

const files = (await readdir(new URL('../src/data/dishes/', import.meta.url))).filter(file => file.endsWith('.json'))
assert.ok(files.length > 0, 'No dish manifests found')
for (const file of files) {
  validateDish(JSON.parse(await readFile(new URL(`../src/data/dishes/${file}`, import.meta.url), 'utf8')), file)
}

// A product with no model is still a complete menu entry.
validateDish({
  id: 'flat-white',
  name: 'Flat white',
  category: 'CafÃ©s',
  description: 'Doble ristretto y leche texturizada.',
  art: 'cup',
  price: 20,
  ingredients: ['CafÃ© de especialidad', 'Leche'],
  allergenNote: 'Contiene lÃ¡cteos.',
})

const layered = JSON.parse(await readFile(new URL('../test-assets/layered-dish.json', import.meta.url), 'utf8'))
// The fixture lives outside the menu: it keeps the layered contract (clip,
// exploded camera, ingredient groups) covered without shipping a second model.
validateDish(layered, 'layered fixture', { checkFiles: false })

const invalid = structuredClone(layered)
invalid.viewer.ingredients[1].materialPrefixes.push('top-bun')
assert.throws(
  () => validateDish(invalid, 'invalid fixture', { checkFiles: false }),
  /duplicate or empty material prefix/i,
)

console.log(`PASS: ${files.length} menu manifests plus the layered fixture: real dimensions, assets, optional layers and unique ingredient/material groups.`)

