import type { Dish, MenuCategory } from '@/data/menu'
import { ProductCard } from './product-card'

export function MenuSection({
  category,
  index,
  items,
  onOpen,
}: {
  category: MenuCategory
  index: number
  items: readonly Dish[]
  onOpen: (dish: Dish, trigger: HTMLButtonElement) => void
}) {
  const slug = category.label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return (
    <section className="menu-section" aria-labelledby={`cat-${slug}`}>
      <header className="category-head">
        <span className="category-index" aria-hidden="true">{String(index).padStart(2, '0')}</span>
        <div className="category-copy">
          <h2 id={`cat-${slug}`}>
            {category.label}
            <span className="category-count">{items.length}</span>
          </h2>
          <p>{category.blurb}</p>
        </div>
      </header>
      <div className="product-grid">
        {items.map(dish => (
          <ProductCard key={dish.id} dish={dish} tone={category.tone} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}
