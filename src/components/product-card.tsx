import { ArrowUpRight } from 'lucide-react'
import { formatPrice, type Dish, type MenuCategory } from '@/data/menu'
import { ProductArt } from './product-art'

export function ProductCard({
  dish,
  tone,
  onOpen,
}: {
  dish: Dish
  tone: MenuCategory['tone']
  onOpen: (dish: Dish, trigger: HTMLButtonElement) => void
}) {
  const action = dish.viewer ? 'Ver en 3D y realidad aumentada' : 'Ver ingredientes y alérgenos'
  return (
    <button
      type="button"
      className={`product-card tone-${tone}`}
      data-product-id={dish.id}
      {...(dish.viewer ? { 'data-viewer-trigger': '' } : {})}
      onClick={event => onOpen(dish, event.currentTarget)}
      aria-label={`${dish.name}, ${formatPrice(dish.price)}. ${action}`}
    >
      <span className="product-card-art">
        {dish.badge && <span className="card-badge">{dish.badge}</span>}
        {dish.poster ? (
          <img className="card-poster" src={dish.poster} alt="" width="600" height="500" loading="eager" decoding="async" />
        ) : (
          <ProductArt kind={dish.art} />
        )}
      </span>
      <span className="product-card-body">
        <span className="card-cat">{dish.category}</span>
        <span className="card-name">{dish.name}</span>
        <span className="card-desc">{dish.description}</span>
        <span className="card-foot">
          <span className="card-price">{formatPrice(dish.price)}</span>
          <span className="card-go" aria-hidden="true">
            <ArrowUpRight size={18} strokeWidth={2.4} />
          </span>
        </span>
      </span>
    </button>
  )
}
