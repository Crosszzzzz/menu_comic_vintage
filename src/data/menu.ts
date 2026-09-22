export const restaurant = {
  name: 'mesa',
  tagline: 'Tu próximo bocado, de cerca.',
}

// Restaurant-provided prices and dietary claims belong here, never inferred
// from the scan. A missing price is deliberately shown as "Ask your server".
export const signatureDish = {
  id: 'egg-tomato',
  name: 'Sándwich de huevo y tomate',
  category: 'Sándwiches',
  description: 'Pan suave, huevo y tomate. Una combinación sencilla que siempre apetece.',
  ingredients: ['Huevo', 'Tomate', 'Pan'],
  price: null as number | null,
  currency: 'USD',
  model: '/models/egg-tomato.glb',
  iosModel: '/models/egg-tomato.usdz',
  poster: '/images/egg-tomato.webp',
  widthCm: 12,
  approximateHeightCm: 6,
  allergenNote: 'Contiene huevo y pan. Consulta al personal sobre gluten, otros alérgenos y contaminación cruzada antes de pedir.',
} as const

export function formatPrice(price: number | null, currency: string) {
  return price === null
    ? 'Consulta el precio con el personal'
    : new Intl.NumberFormat('es-BO', { style: 'currency', currency }).format(price)
}
