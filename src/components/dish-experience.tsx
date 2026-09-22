import { useEffect, useRef, useState } from 'react'
import '@google/model-viewer'
import type { ModelViewerElement } from '@google/model-viewer'
import { ArrowUpRight, Box, LoaderCircle, Move, Pause, Play, RotateCcw, ScanLine, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { signatureDish as dish, formatPrice } from '@/data/menu'
import type { ViewerIntent } from './dish-dialog'

const initialOrbit = '30deg 72deg 105%'

export default function DishExperience({ intent }: { intent: ViewerIntent }) {
  const viewer = useRef<ModelViewerElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [canAR, setCanAR] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [arMessage, setARMessage] = useState('')

  useEffect(() => {
    const element = viewer.current
    if (!element) return
    const syncARAvailability = () => setCanAR(element.canActivateAR)
    const availabilityObserver = new MutationObserver(syncARAvailability)
    if (element.shadowRoot) {
      availabilityObserver.observe(element.shadowRoot, {
        subtree: true, attributes: true, attributeFilter: ['class'], childList: true,
      })
    }
    const timeout = window.setTimeout(() => {
      if (!element.loaded) setFailed(true)
    }, 35_000)
    const onLoad = () => {
      window.clearTimeout(timeout)
      setLoaded(true)
      setFailed(false)
      setCanAR(element.canActivateAR)
    }
    const onError = () => {
      window.clearTimeout(timeout)
      setFailed(true)
      setLoaded(false)
    }
    const onProgress = (event: Event) => setProgress(Math.round((event as CustomEvent<{ totalProgress: number }>).detail.totalProgress * 100))
    const onARStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status: string }>).detail.status
      if (status === 'failed') {
        setLaunching(false)
        setARMessage('No se pudo iniciar AR. Revisa los permisos de cámara o prueba Safari en iPhone o Chrome en Android. Puedes seguir explorando en 3D.')
      } else if (status === 'session-started') {
        setARMessage('Mueve el móvil despacio para encontrar la mesa.')
      } else if (status === 'object-placed') {
        setARMessage('Tu plato está en la mesa. El tamaño es aproximado.')
      } else if (status === 'not-presenting') {
        setLaunching(false)
        setARMessage('')
      }
    }
    element.addEventListener('load', onLoad)
    element.addEventListener('error', onError)
    element.addEventListener('progress', onProgress)
    element.addEventListener('ar-status', onARStatus)
    if (element.loaded) onLoad()
    return () => {
      window.clearTimeout(timeout)
      availabilityObserver.disconnect()
      element.removeEventListener('load', onLoad)
      element.removeEventListener('error', onError)
      element.removeEventListener('progress', onProgress)
      element.removeEventListener('ar-status', onARStatus)
    }
  }, [attempt])

  useEffect(() => {
    if (viewer.current) viewer.current.autoRotate = rotating
  }, [rotating, attempt])

  async function activateAR() {
    if (!viewer.current || !loaded || !canAR) return
    setLaunching(true)
    setRotating(false)
    setARMessage('Abriendo el visor de cámara…')
    try {
      // Keep this call in the click handler: native viewers require a user gesture.
      await viewer.current.activateAR()
      setARMessage('Sigue las indicaciones del visor para colocar tu plato.')
    } catch {
      setARMessage('No se pudo iniciar AR. Revisa los permisos de cámara e inténtalo de nuevo. La vista 3D sigue disponible.')
    } finally {
      setLaunching(false)
    }
  }

  function resetView() {
    if (!viewer.current) return
    setRotating(false)
    viewer.current.cameraOrbit = initialOrbit
    viewer.current.fieldOfView = '30deg'
    viewer.current.resetTurntableRotation()
  }

  function retry() {
    setFailed(false)
    setLoaded(false)
    setCanAR(false)
    setProgress(0)
    setRotating(false)
    setAttempt((value) => value + 1)
  }

  return (
    <div className="dish-experience">
      <section className="model-section" aria-label="Plato 3D interactivo">
        <div className="model-stage">
          <span className="stage-caption eyebrow"><Box size={14} aria-hidden="true" /> VISTA 3D</span>
          <model-viewer
            key={attempt}
            ref={viewer}
            src={attempt === 0 ? dish.model : `${dish.model}?retry=${attempt}`}
            ios-src={dish.iosModel}
            poster={dish.poster}
            alt="Sándwich de huevo y tomate en 3D. Arrastra para girar; pellizca o usa la rueda para acercarte. Con teclado, usa las flechas para girar."
            ar
            ar-modes="quick-look webxr scene-viewer"
            ar-scale="fixed"
            ar-placement="floor"
            ar-usdz-max-texture-size="2048"
            camera-controls
            camera-orbit={initialOrbit}
            min-camera-orbit="auto 25deg 60%"
            max-camera-orbit="auto 90deg 180%"
            field-of-view="30deg"
            shadow-intensity="0.8"
            shadow-softness="1"
            exposure="1.05"
            environment-image="neutral"
            interaction-prompt="none"
            touch-action="none"
            disable-pan
            loading="eager"
            reveal="auto"
          >
            <span slot="ar-button" hidden />
            <span slot="progress-bar" hidden />
            <div className="ar-guidance"><Move aria-hidden="true" size={22} /><span>Mueve despacio el móvil para encontrar la mesa</span></div>
          </model-viewer>
          {!loaded && !failed && (
            <div className="model-loading" role="status">
              <LoaderCircle size={17} className="loading-spinner" />
              <span>Cargando tu plato… {progress}%</span>
            </div>
          )}
          {failed && (
            <div className="model-error" role="alert">
              <img src={dish.poster} alt={dish.name} />
              <div><h3>No se pudo cargar la vista 3D.</h3><p>Tu plato sigue aquí. Revisa tu conexión e inténtalo de nuevo.</p><Button onClick={retry} variant="outline">Reintentar <RotateCcw size={16} /></Button></div>
            </div>
          )}
        </div>
        <div className="model-toolbar">
          <span className="drag-hint"><Move size={15} aria-hidden="true" /> Arrastra para girar</span>
          <div>
            <Button variant="ghost" size="icon" aria-label={rotating ? 'Pausar giro' : 'Girar automáticamente'} aria-pressed={rotating} disabled={!loaded || failed} onClick={() => setRotating((value) => !value)}>
              {rotating ? <Pause /> : <Play />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Restablecer vista" disabled={!loaded || failed} onClick={resetView}><RotateCcw /></Button>
          </div>
        </div>
      </section>
      <section className="experience-info" aria-label="Detalles del plato">
        <p className="eyebrow">01 / SÁNDWICHES</p>
        <h2>Huevo, tomate<br /><em>y buen pan.</em></h2>
        <p className="dish-description">{dish.description}</p>
        <p className="price-note">{formatPrice(dish.price, dish.currency)}</p>
        <Accordion type="single" collapsible className="dish-accordion">
          <AccordionItem value="ingredients">
            <AccordionTrigger>Ingredientes y alérgenos</AccordionTrigger>
            <AccordionContent>
              <p>{dish.ingredients.join(' · ')}</p>
              <p className="allergen-note">{dish.allergenNote}</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="size">
            <AccordionTrigger>Tamaño del plato</AccordionTrigger>
            <AccordionContent>Aproximadamente {dish.widthCm} cm de ancho y {dish.approximateHeightCm} cm de alto. Conservamos las proporciones del escaneo. En tu mesa se muestra a escala fija; la precisión depende del dispositivo.</AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="ar-action">
          {intent === 'ar' && !failed && <p className="ar-intro">Apunta a una mesa bien iluminada.</p>}
          <Button className="primary-button ar-button" disabled={!loaded || !canAR || failed || launching} onClick={activateAR}>
            {launching ? <LoaderCircle className="loading-spinner" /> : <ScanLine />}
            {launching ? 'Abriendo AR…' : 'Ver en mi mesa'}
            {!launching && <ArrowUpRight size={17} strokeWidth={2} aria-hidden="true" />}
          </Button>
          <p className="ar-availability">
            <Smartphone size={14} aria-hidden="true" />
            {!loaded && !failed
              ? 'Comprobando tu dispositivo…'
              : canAR
                ? 'La cámara se abre al tocar el botón. Escala aproximada de 12 × 6 cm.'
                : !window.isSecureContext
                  ? 'Prueba Safari en iPhone o abre el menú mediante HTTPS.'
                  : 'En iPhone, abre este menú en Safari. Aquí puedes explorar en 3D.'}
          </p>
          {arMessage && <p className="ar-message" role="status">{arMessage}</p>}
        </div>
      </section>
    </div>
  )
}
