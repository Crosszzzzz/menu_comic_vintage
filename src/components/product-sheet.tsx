import { lazy, Suspense, type RefObject } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { categoryTone, type Dish } from '@/data/menu'
import { ProductArt } from './product-art'
import { ProductInfo } from './product-info'
import { ViewerBoundary } from './viewer-boundary'

const ProductViewer = lazy(() => import('./product-viewer'))

export function ProductSheet({
  dish,
  open,
  onOpenChange,
  returnFocusTo,
}: {
  dish: Dish | null
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusTo: RefObject<HTMLElement | null>
}) {
  if (!dish) return null
  const tone = `tone-${categoryTone(dish.category)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`product-sheet ${tone}`}
        onCloseAutoFocus={event => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        <DialogTitle className="sr-only">{dish.name}</DialogTitle>
        <DialogDescription className="sr-only">
          {dish.viewer
            ? `Explora ${dish.name} en 3D o colócalo sobre tu mesa con realidad aumentada.`
            : `Ingredientes, alérgenos y precio de ${dish.name}.`}
        </DialogDescription>

        <header className="sheet-head">
          <p className="eyebrow">{dish.category}</p>
          <span className="sheet-head-note">
            {dish.viewer ? (dish.viewer.ingredients?.length ? 'Gira · acerca · toca' : 'Gira · acerca · míralo') : 'Carta Botana'}
          </span>
        </header>

        {dish.viewer ? (
          <ViewerBoundary key={dish.id} dish={dish}>
            <Suspense fallback={<SheetFallback dish={dish} />}>
              {open && <ProductViewer dish={dish} />}
            </Suspense>
          </ViewerBoundary>
        ) : (
          <div className="product-layout is-static">
            <div className="product-stage static-stage">
              <span className="stage-caption eyebrow">Ilustración</span>
              {dish.poster ? (
                <img className="static-poster" src={dish.poster} alt={dish.name} width="600" height="500" />
              ) : (
                <ProductArt kind={dish.art} />
              )}
            </div>
            <ProductInfo dish={dish} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SheetFallback({ dish }: { dish: Dish }) {
  return (
    <div className="product-layout is-static">
      <div className="product-stage static-stage">
        <span className="stage-caption eyebrow">Preparando la vista</span>
        {dish.poster ? (
          <img className="static-poster" src={dish.poster} alt="" width="600" height="500" />
        ) : (
          <ProductArt kind={dish.art} />
        )}
        <p className="sheet-loading" role="status">
          <LoaderCircle className="loading-spinner" size={18} aria-hidden="true" /> Preparando la vista 3D…
        </p>
      </div>
      <ProductInfo dish={dish} />
    </div>
  )
}
