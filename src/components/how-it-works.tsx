import { Box, CircleHelp, MousePointerClick, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const steps = [
  {
    icon: MousePointerClick,
    title: 'Elige tu antojo.',
    text: 'Toca cualquier producto de la carta para ver sus ingredientes, alérgenos y precio.',
  },
  {
    icon: Box,
    title: 'Míralo de cerca.',
    text: 'Los productos con sello 3D se giran, se acercan y se abren por capas. Arrastra con el dedo o el ratón.',
  },
  {
    icon: ScanLine,
    title: 'Ponlo en tu mesa.',
    text: 'En un móvil compatible, toca «Ver en mi mesa» y apunta a la mesa. No hay que instalar nada.',
  },
]

export function HowItWorks() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="how-link" aria-label="Cómo funciona">
          <CircleHelp size={18} strokeWidth={2.2} aria-hidden="true" />
          <span className="how-label">Cómo funciona</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="info-dialog">
        <p className="eyebrow">ANTES DE PEDIR</p>
        <DialogTitle className="editorial-title">Mira. Gira. Pídelo.</DialogTitle>
        <DialogDescription>La carta de Botana, con una vuelta extra.</DialogDescription>
        <ol className="how-steps">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li key={title}>
              <span className="step-number">0{index + 1}</span>
              <div>
                <h3>
                  <Icon size={18} aria-hidden="true" />
                  {title}
                </h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="fine-print">
          La realidad aumentada necesita un móvil compatible y una conexión segura. Puedes explorar en 3D desde cualquier
          dispositivo. El tamaño y la posición son aproximados.
        </p>
      </DialogContent>
    </Dialog>
  )
}
