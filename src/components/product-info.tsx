import type { ReactNode } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { formatPrice, type Dish } from '@/data/menu'

export function ProductInfo({ dish, actions, className = '' }: { dish: Dish; actions?: ReactNode; className?: string }) {
  const dimensions = dish.viewer ? dish.dimensions : undefined

  return (
    <section className={`product-info ${className}`} aria-label={`Detalles de ${dish.name}`}>
      <p className="eyebrow sheet-cat">{dish.category}</p>
      <h2 className="sheet-name">{dish.name}</h2>
      <p className="sheet-price">{formatPrice(dish.price)}</p>
      <p className="sheet-desc">{dish.description}</p>

      <ul className="ingredient-tags" aria-label="Ingredientes">
        {dish.ingredients.map(ingredient => (
          <li key={ingredient}>{ingredient}</li>
        ))}
      </ul>

      <Accordion type="single" collapsible className="dish-accordion">
        <AccordionItem value="allergens">
          <AccordionTrigger>Alérgenos</AccordionTrigger>
          <AccordionContent>{dish.allergenNote}</AccordionContent>
        </AccordionItem>
        {dimensions && (
          <AccordionItem value="size">
            <AccordionTrigger>Tamaño real</AccordionTrigger>
            <AccordionContent>
              {dimensions.depthCm
                ? `Mide aproximadamente ${dimensions.widthCm} × ${dimensions.depthCm} cm y ${dimensions.heightCm} cm de alto.`
                : `Mide aproximadamente ${dimensions.widthCm} cm de ancho y ${dimensions.heightCm} cm de alto.`}{' '}
              En AR se coloca a escala fija; la precisión depende del teléfono.
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {actions && <div className="sheet-actions">{actions}</div>}
    </section>
  )
}
