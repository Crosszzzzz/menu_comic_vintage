import { useRef, useState } from 'react'
import { Box } from 'lucide-react'
import { ALL_CATEGORIES, CategoryNav } from '@/components/category-nav'
import { MenuHeader } from '@/components/menu-header'
import { MenuSection } from '@/components/menu-section'
import { ProductSheet } from '@/components/product-sheet'
import { categories, dishesOf, modelledCount, restaurant, type Dish } from '@/data/menu'

function Masthead() {
  return (
    <section className="masthead" aria-labelledby="menu-title">
      <div className="masthead-copy">
        <p className="eyebrow">CAFÉ DE BARRIO · CARTA</p>
        <h1 id="menu-title">La <em>carta.</em></h1>
        <p className="masthead-note">
          Toca un producto para verlo en 3D, revisar sus ingredientes y su precio. En el móvil también puedes ponerlo
          sobre tu mesa.
        </p>
        <p className="masthead-meta">
          <Box size={15} aria-hidden="true" />
          {modelledCount} {modelledCount === 1 ? 'producto' : 'productos'} en 3D y AR
          <span aria-hidden="true">·</span>
          {categories.length} secciones
        </p>
      </div>
      <div className="masthead-stamp" aria-hidden="true">
        <span>GIRA<br />MIRA<br />PIDE</span>
      </div>
    </section>
  )
}

export default function App() {
  const [active, setActive] = useState<string>(ALL_CATEGORIES)
  const [selected, setSelected] = useState<Dish | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  const sections = active === ALL_CATEGORIES ? categories : categories.filter(category => category.label === active)

  function openProduct(dish: Dish, trigger: HTMLButtonElement) {
    returnFocusTo.current = trigger
    setSelected(dish)
    setSheetOpen(true)
  }

  function changeFilter(next: string) {
    if (next === active) return
    setActive(next)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <>
      <a className="skip-link" href="#carta">Ir a la carta</a>
      <div className="site-shell">
        <MenuHeader />

        <main id="carta">
          <Masthead />
          <CategoryNav active={active} onChange={changeFilter} />

          {sections.map(category => (
            <MenuSection
              key={category.label}
              category={category}
              index={categories.findIndex(item => item.label === category.label) + 1}
              items={dishesOf(category.label)}
              onOpen={openProduct}
            />
          ))}
        </main>

        <footer className="site-footer">
          <p>
            <span className="footer-brand">{restaurant.name}</span>
            <span className="footer-dot" aria-hidden="true">·</span>
            {restaurant.claim}
          </p>
          <p className="footer-note">Los modelos 3D y el tamaño en AR son aproximados. Buen provecho.</p>
        </footer>
      </div>

      <ProductSheet dish={selected} open={sheetOpen} onOpenChange={setSheetOpen} returnFocusTo={returnFocusTo} />
    </>
  )
}
