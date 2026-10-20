import americano from './dishes/americano.json'
import cafePasado from './dishes/cafe-pasado.json'
import capuchino from './dishes/capuchino.json'
import cheesecakeCaramelo from './dishes/cheesecake-caramelo.json'
import cheesecakeMango from './dishes/cheesecake-mango.json'
import croissant from './dishes/croissant.json'
import payManzana from './dishes/pay-manzana.json'
import profiterolVainilla from './dishes/profiterol-vainilla.json'
import tortaPrincesa from './dishes/torta-princesa.json'
import type { Dish, ProductArt } from './dish'

export type { Dish, DishCameraPose, DishIngredient, DishViewer, ProductArt } from './dish'

export const restaurant = {
  name: 'Botana',
  tagline: 'Café de barrio',
  claim: 'Café y repostería de la casa.',
  currency: 'BOB',
  locale: 'es-BO',
}

export interface MenuCategory {
  label: string
  blurb: string
  /** Card-art background, kept in the same pastel comic palette. */
  tone: 'sage' | 'butter' | 'blue' | 'peach'
}

// Category order is also the menu order. A product joins a category through
// its `category` label, so adding one never touches the layout.
export const categories: readonly MenuCategory[] = [
  { label: 'Cafés', blurb: 'Espresso, filtro y leche vaporizada.', tone: 'sage' },
  { label: 'Postres', blurb: 'Horneado aquí, cada mañana.', tone: 'blue' },
]

// JSON string literals widen to `string`; every manifest is validated by
// `scripts/verify-dish-config.mjs`, so only the art key needs narrowing here.
function manifest(raw: Omit<Dish, 'art'> & { art: string }): Dish {
  return { ...raw, art: raw.art as ProductArt }
}

// Prices, sizes and allergen notes are restaurant-owned data: edit them in
// `src/data/dishes/<producto>.json`. A product without `viewer` still gets a
// full card and detail sheet.
export const dishes: readonly Dish[] = [
  manifest(capuchino),
  manifest(americano),
  manifest(cafePasado),
  manifest(payManzana),
  manifest(croissant),
  manifest(cheesecakeMango),
  manifest(tortaPrincesa),
  manifest(cheesecakeCaramelo),
  manifest(profiterolVainilla),
]

export function formatPrice(price: number | null) {
  if (price === null) return 'Consulta el precio en barra'
  return new Intl.NumberFormat(restaurant.locale, {
    style: 'currency',
    currency: restaurant.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function categoryTone(label: string) {
  return categories.find(category => category.label === label)?.tone ?? 'sage'
}

export function dishesOf(label: string) {
  return dishes.filter(dish => dish.category === label)
}

export const modelledCount = dishes.filter(dish => dish.viewer).length
