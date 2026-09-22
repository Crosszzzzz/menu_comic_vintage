import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { signatureDish } from '@/data/menu'

export class ViewerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="viewer-fallback" role="alert">
          <img src={signatureDish.poster} alt={signatureDish.name} />
          <h3>No se pudo cargar la vista 3D.</h3>
          <p>Puedes seguir viendo la carta. Revisa tu conexión e inténtalo de nuevo.</p>
          <Button onClick={() => window.location.reload()}>Recargar página</Button>
        </div>
      )
    }
    return this.props.children
  }
}
