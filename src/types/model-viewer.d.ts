import type { DetailedHTMLProps, HTMLAttributes } from 'react'
import type { ModelViewerElement } from '@google/model-viewer'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> & {
        src?: string
        'ios-src'?: string
        alt?: string
        poster?: string
        ar?: boolean
        'ar-modes'?: string
        'ar-scale'?: string
        'ar-placement'?: string
        'ar-usdz-max-texture-size'?: string
        'camera-controls'?: boolean
        'camera-orbit'?: string
        'min-camera-orbit'?: string
        'max-camera-orbit'?: string
        'camera-target'?: string
        'field-of-view'?: string
        'shadow-intensity'?: string
        'shadow-softness'?: string
        exposure?: string
        'interaction-prompt'?: string
        'touch-action'?: string
        'disable-pan'?: boolean
        'environment-image'?: string
        loading?: string
        reveal?: string
      }
    }
  }
}
