import { categories, dishes, dishesOf } from '@/data/menu'

export const ALL_CATEGORIES = 'all'

export function CategoryNav({ active, onChange }: { active: string; onChange: (next: string) => void }) {
  return (
    <nav className="category-nav" aria-label="Filtrar la carta">
      <div className="category-track">
        <button type="button" className="cat-chip" aria-pressed={active === ALL_CATEGORIES} onClick={() => onChange(ALL_CATEGORIES)}>
          Todo<span>{dishes.length}</span>
        </button>
        {categories.map(category => (
          <button
            key={category.label}
            type="button"
            className="cat-chip"
            aria-pressed={active === category.label}
            onClick={() => onChange(category.label)}
          >
            {category.label}
            <span>{dishesOf(category.label).length}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
