import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { Dish } from '@/data/menu'
import { ProductArt } from './product-art'

export class ViewerBoundary extends Component<{ children: ReactNode; dish: Dish }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="viewer-fallback" role="alert">
          {this.props.dish.poster ? (
            <img src={this.props.dish.poster} alt={this.props.dish.name} />
          ) : (
            <ProductArt kind={this.props.dish.art} />
          )}
          <h3>No se pudo cargar la vista 3D.</h3>
          <p>Puedes seguir viendo la carta. Revisa tu conexión e inténtalo de nuevo.</p>
          <Button onClick={() => window.location.reload()}>Recargar página</Button>
        </div>
      )
    }
    return this.props.children
  }
}
