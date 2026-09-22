import { ArrowUpRight, Box, ScanLine, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const steps = [
  { icon: Box, title: 'Conoce tu plato.', text: 'Abre la vista 3D para girarlo y acercarte. No necesita cámara.' },
  { icon: ScanLine, title: 'Hazle un lugar.', text: 'En un móvil compatible, toca «Ver en mi mesa» y permite el acceso a la cámara.' },
  { icon: Move, title: 'Encuentra la superficie.', text: 'Mueve el móvil despacio sobre una mesa iluminada, sin reflejos. Sigue las indicaciones para colocar el plato.' },
]

export function InfoDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="how-link">Cómo funciona <ArrowUpRight size={15} strokeWidth={2.2} aria-hidden="true" /></Button>
      </DialogTrigger>
      <DialogContent className="info-dialog">
        <p className="eyebrow">A TU GUSTO</p>
        <DialogTitle className="editorial-title">Primero mira. Luego disfruta.</DialogTitle>
        <DialogDescription>Dos formas de conocer lo que vas a pedir.</DialogDescription>
        <ol className="how-steps">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li key={title}>
              <span className="step-number">0{index + 1}</span>
              <div><h3><Icon size={18} aria-hidden="true" />{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
        <p className="fine-print">La realidad aumentada requiere un móvil compatible y conexión HTTPS. Puedes usar la vista 3D en otros dispositivos. El tamaño y la posición son aproximados.</p>
      </DialogContent>
    </Dialog>
  )
}
