/** Metres and glTF coordinates: X right, Y up, Z forward. */
export interface DishCameraPose {
  thetaDeg: number
  phiDeg: number
  radiusM: number
  targetM: readonly number[]
}

export interface DishIngredient {
  id: string
  label: string
  description: string
  /** Exported material names connect geometry to the menu's ingredient groups. */
  materialPrefixes: readonly string[]
}

export interface DishViewer {
  model: string
  ios: { assembled: string; exploded?: string }
  /** Only for layered models; everything else is a single, static mesh. */
  animation?: { name: string; transitionMs: number }
  /** Omit to let model-viewer frame the product automatically. */
  camera?: {
    assembled: DishCameraPose
    exploded?: DishCameraPose
    minRadiusM: number
    maxRadiusM: number
    fieldOfViewDeg: number
  }
  ingredients?: readonly DishIngredient[]
  labels: {
    assembledCaption: string
    explodedCaption?: string
    assemble?: string
    explode?: string
  }
  alt: string
}

/** Comic drawings used while a product has no scanned model. */
export type ProductArt =
  | 'cup'
  | 'cortado'
  | 'latte'
  | 'glass'
  | 'iced'
  | 'lemonade'
  | 'pastry'
  | 'roll'
  | 'brownie'
  | 'toast'
  | 'sandwich'

/**
 * A menu product. Only `viewer` is optional: the card, the price, the
 * ingredients and the AR/3D badge all derive from the same manifest, so a
 * product becomes interactive the moment its model is wired in.
 */
export interface Dish {
  id: string
  name: string
  /** Display label; must match one of the categories in `menu.ts`. */
  category: string
  description: string
  ingredients: readonly string[]
  price: number | null
  art: ProductArt
  /** Rendered poster for modelled products. */
  poster?: string
  /** Short sticker shown over the card art, e.g. "En 3D · AR". */
  badge?: string
  dimensions?: { widthCm: number; depthCm?: number; heightCm: number }
  allergenNote: string
  viewer?: DishViewer
}
