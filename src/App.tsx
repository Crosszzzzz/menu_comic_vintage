import { useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Box, Egg, ScanLine, Wheat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { DishDialog, type ViewerIntent } from '@/components/dish-dialog'
import { InfoDialog } from '@/components/info-dialog'
import { restaurant, signatureDish as dish, formatPrice } from '@/data/menu'

function TomatoDrawing() {
  return <svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M16 10C6 5 1 15 7 24c4 5 14 5 18-1 6-9 0-17-9-13Z" /><path d="m10 8 6 5 6-5-6 2V4m0 9-4 4m4-4 4 4" strokeLinecap="round" /></svg>
}

export default function App() {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [intent, setIntent] = useState<ViewerIntent>('3d')
  const [imageFailed, setImageFailed] = useState(false)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  function openDish(nextIntent: ViewerIntent, trigger: HTMLElement) {
    returnFocusTo.current = trigger
    setIntent(nextIntent)
    setViewerOpen(true)
  }

  return (
    <>
      <a className="skip-link" href="#menu">Ir al menú</a>
      <div className="site-shell">
        <header className="site-header">
          <a className="wordmark" href="#" aria-label="Mesa, inicio">{restaurant.name}</a>
          <p className="header-tagline">{restaurant.tagline}</p>
          <InfoDialog />
        </header>

        <main id="menu">
          <section className="menu-intro" aria-labelledby="menu-title">
            <div>
              <p className="eyebrow intro-eyebrow">HECHO PARA DISFRUTAR</p>
              <h1 id="menu-title">La <em>carta.</em></h1>
            </div>
            <p className="intro-aside">Algo rico.<br />Desde todos los ángulos.<ArrowDown size={19} strokeWidth={1.4} aria-hidden="true" /></p>
          </section>

          <div className="section-rule"><p>DE NUESTRA COCINA</p><span>01 / SÁNDWICHES</span></div>

          <article className="featured-dish" aria-labelledby="dish-title">
            <button className="dish-visual" onClick={(event) => openDish('3d', event.currentTarget)} aria-label="Explorar el sándwich de huevo y tomate en 3D">
              <span className="visual-number">01<span> / </span></span>
              <span className="visual-note">HUEVO, TOMATE.<br />Y UN BUEN PAN.</span>
              <span className="hero-pop" aria-hidden="true">¡ÑAM!</span>
              <span className="dish-halo" aria-hidden="true" />
              {imageFailed ? <span className="image-fallback"><Egg size={68} strokeWidth={1} /><span>Sándwich de huevo y tomate</span></span> : <img className="dish-image" src={dish.poster} alt="Sándwich de huevo y tomate, capturado en 3D" width="1200" height="1000" fetchPriority="high" onError={() => setImageFailed(true)} />}
              <span className="visual-bottom"><span><Box size={17} strokeWidth={1.5} aria-hidden="true" /> MÍRALO EN 360°</span><span className="visual-arrow"><ArrowUpRight size={23} strokeWidth={1.5} aria-hidden="true" /></span></span>
            </button>

            <div className="dish-copy">
              <p className="eyebrow category">01 / {dish.category.toUpperCase()}</p>
              <h2 id="dish-title">Huevo, tomate<br /><em>y buen pan.</em></h2>
              <p className="dish-description">{dish.description}</p>
              <p className="price-note">{formatPrice(dish.price, dish.currency)}</p>

              <div className="ingredient-line" aria-label="Ingredientes principales">
                <span><Egg size={24} strokeWidth={1.3} aria-hidden="true" />Huevo</span>
                <span><TomatoDrawing />Tomate</span>
                <span><Wheat size={25} strokeWidth={1.3} aria-hidden="true" />Pan</span>
              </div>

              <div className="dish-actions">
                <Button className="primary-button explore-button" onClick={(event) => openDish('3d', event.currentTarget)}>Explorar en 3D<ArrowUpRight size={19} /></Button>
                <Button variant="ghost" className="table-link" onClick={(event) => openDish('ar', event.currentTarget)}><ScanLine size={18} />Ver en mi mesa</Button>
              </div>
              <Accordion type="single" collapsible className="menu-allergens">
                <AccordionItem value="allergens">
                  <AccordionTrigger>Ingredientes y alérgenos</AccordionTrigger>
                  <AccordionContent>{dish.allergenNote}</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </article>

          <section className="perspective-note" aria-label="Sobre la experiencia">
            <p>Antes del primer bocado.<br /><em>Míralo de cerca.</em></p>
            <span>Gira el plato. Acércate.<br />Descubre lo que vas a pedir.</span>
          </section>
        </main>

        <footer className="site-footer"><span>mesa<span className="footer-dot">·</span>Un lugar en tu mesa.</span><span>Buen provecho.</span></footer>
      </div>
      <DishDialog open={viewerOpen} intent={intent} onOpenChange={setViewerOpen} returnFocusTo={returnFocusTo} />
    </>
  )
}
