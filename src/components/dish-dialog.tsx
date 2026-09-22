import { lazy, Suspense } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { signatureDish } from '@/data/menu'
import { ViewerBoundary } from './viewer-boundary'

const DishExperience = lazy(() => import('./dish-experience'))

export type ViewerIntent = '3d' | 'ar'

export function DishDialog({ open, intent, onOpenChange, returnFocusTo }: {
  open: boolean
  intent: ViewerIntent
  onOpenChange: (open: boolean) => void
  returnFocusTo: React.RefObject<HTMLElement | null>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="dish-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        <header className="dish-dialog-header">
          <DialogTitle>De cerca.</DialogTitle>
          <span className="eyebrow">TU PLATO, EN 360°</span>
          <DialogDescription className="sr-only">Gira el sándwich en 3D o colócalo sobre una mesa con realidad aumentada.</DialogDescription>
        </header>
        <ViewerBoundary>
          <Suspense fallback={
            <div className="viewer-suspense">
              <img src={signatureDish.poster} alt={signatureDish.name} />
              <p role="status"><LoaderCircle className="loading-spinner" size={18} /> Preparando la vista 3D…</p>
            </div>
          }>
            {open && <DishExperience intent={intent} />}
          </Suspense>
        </ViewerBoundary>
      </DialogContent>
    </Dialog>
  )
}
