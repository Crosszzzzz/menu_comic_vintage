import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import '@google/model-viewer'
import type { ModelViewerElement } from '@google/model-viewer'
import { ArrowUpRight, Box, Layers, LoaderCircle, Move, MousePointer2, Pause, Play, RotateCcw, ScanLine, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Dish, DishCameraPose, DishViewer } from '@/data/menu'
import { ProductInfo } from './product-info'

type FoodMaterial = NonNullable<ModelViewerElement['model']>['materials'][number]

function orbitFor(pose: DishCameraPose) {
  return `${pose.thetaDeg}deg ${pose.phiDeg}deg ${pose.radiusM}m`
}

function targetFor(pose: DishCameraPose) {
  return pose.targetM.map(value => `${value}m`).join(' ')
}

export default function ProductViewer({ dish }: { dish: Dish }) {
  return <DishViewer key={dish.id} dish={dish} />
}

function DishViewer({ dish }: { dish: Dish }) {
  const config = dish.viewer as DishViewer
  const ingredientDetails = config.ingredients ?? []
  const canExplode = Boolean(config.animation)
  const hasIngredients = ingredientDetails.length > 0
  const viewer = useRef<ModelViewerElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [canAR, setCanAR] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [arMessage, setARMessage] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null)
  const [hoveredIngredient, setHoveredIngredient] = useState<string | null>(null)
  const hover = useRef<{ id: string | null; originals: { material: FoodMaterial; emission: [number, number, number] }[] }>({ id: null, originals: [] })
  const hoverFrame = useRef<number | null>(null)
  const separation = useRef(0)
  const motion = useRef<number | null>(null)
  const pointer = useRef<{ x: number; y: number; id: number; dragged: boolean } | null>(null)
  const selected = ingredientDetails.find(item => item.id === selectedIngredient)
  const hovered = ingredientDetails.find(item => item.id === hoveredIngredient)

  function ingredientFromMaterial(name: string) {
    // Longest prefix wins when one ingredient's name contains another's.
    return ingredientDetails.flatMap(ingredient => ingredient.materialPrefixes.map(prefix => ({ ingredient, prefix })))
      .filter(({ prefix }) => name.startsWith(prefix))
      .sort((a, b) => b.prefix.length - a.prefix.length)[0]?.ingredient
  }

  function highlightIngredient(id: string | null) {
    if (hover.current.id === id) return
    for (const { material, emission } of hover.current.originals) material.setEmissiveFactor(emission)
    const originals = (viewer.current?.model?.materials ?? [])
      .filter(material => id && ingredientFromMaterial(material.name)?.id === id)
      .map(material => ({ material, emission: [...material.emissiveFactor] as [number, number, number] }))
    for (const { material, emission } of originals) {
      material.setEmissiveFactor([emission[0] + .19, emission[1] + .12, emission[2] + .025])
    }
    hover.current = { id, originals }
    setHoveredIngredient(id)
    // Camera controls own the cursor inside model-viewer's shadow root.
    const input = viewer.current?.shadowRoot?.querySelector<HTMLElement>('.userInput')
    if (input) input.style.cursor = id ? 'pointer' : pointer.current ? 'grabbing' : 'grab'
  }

  function clearHover() {
    if (hoverFrame.current !== null) cancelAnimationFrame(hoverFrame.current)
    hoverFrame.current = null
    highlightIngredient(null)
  }

  function movePointer(event: ReactPointerEvent<ModelViewerElement>) {
    const down = pointer.current
    if (down && down.id === event.pointerId && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7) {
      // Remember the whole gesture: returning to its starting point is still
      // a drag and must not open an ingredient when the pointer is released.
      down.dragged = true
    }
    if (event.pointerType === 'touch' || event.buttons || pointer.current || motion.current !== null || !loaded || failed) {
      clearHover()
      return
    }
    const { clientX, clientY } = event
    if (hoverFrame.current !== null) cancelAnimationFrame(hoverFrame.current)
    hoverFrame.current = requestAnimationFrame(() => {
      hoverFrame.current = null
      const name = viewer.current?.materialFromPoint(clientX, clientY)?.name ?? ''
      const ingredient = ingredientFromMaterial(name)
      highlightIngredient(ingredient?.id ?? null)
      if (ingredient) setRotating(false)
    })
  }

  function pickIngredient(event: ReactPointerEvent<ModelViewerElement>) {
    const down = pointer.current
    pointer.current = null
    if (!down || down.dragged || event.button !== 0 || down.id !== event.pointerId || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7) return
    const element = viewer.current
    if (!element || !loaded || failed) return
    const name = element.materialFromPoint(event.clientX, event.clientY)?.name ?? ''
    const ingredient = ingredientFromMaterial(name)
    if (ingredient) {
      setSelectedIngredient(ingredient.id)
      setRotating(false)
    } else {
      setSelectedIngredient(null)
    }
  }

  function toggleSeparation() {
    const element = viewer.current
    if (!element || !canExplode || !config.animation || !loaded || failed) return
    clearHover()
    setSelectedIngredient(null)
    if (motion.current !== null) cancelAnimationFrame(motion.current)
    setRotating(false)
    const next = !expanded
    setExpanded(next)
    const start = separation.current
    const end = next ? 1 : 0
    const began = performance.now()
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : config.animation.transitionMs
    const camera = element.getCameraOrbit()
    const target = element.getCameraTarget()
    const destination = next ? config.camera?.exploded : config.camera?.assembled
    const interpolate = (from: number, to: number, amount: number) => from + (to - from) * amount
    const animate = (now: number) => {
      const progress = duration === 0 ? 1 : Math.min((now - began) / duration, 1)
      const eased = progress * progress * (3 - 2 * progress)
      separation.current = start + (end - start) * eased
      element.currentTime = element.duration * Math.min(separation.current, .999999)
      // Keep the user's azimuth and start at the current camera, including when
      // reversing mid-animation, so neither the food nor the framing jumps.
      if (destination) {
        element.cameraOrbit = `${camera.theta}rad ${interpolate(camera.phi, destination.phiDeg * Math.PI / 180, eased)}rad ${interpolate(camera.radius, destination.radiusM, eased)}m`
        element.cameraTarget = [target.x, target.y, target.z].map((value, axis) => `${interpolate(value, destination.targetM[axis], eased)}m`).join(' ')
      }
      if (progress < 1) motion.current = requestAnimationFrame(animate)
      else motion.current = null
    }
    motion.current = requestAnimationFrame(animate)
  }

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
      // A layered manifest declares its clip: if the asset lost it, fail loudly
      // instead of showing a model that cannot be opened.
      if (config.animation && !element.availableAnimations.includes(config.animation.name)) {
        setLoaded(false)
        setFailed(true)
        return
      }
      setLoaded(true)
      setFailed(false)
      setCanAR(element.canActivateAR)
      if (config.animation) {
        element.play({ repetitions: 1, pingpong: false })
        element.pause()
        element.currentTime = element.duration * Math.min(separation.current, .999999)
      }
      // A retried model is a new element: restore the pose that belongs to its
      // animation state, rather than framing separated pieces as a closed dish.
      const pose = config.camera ? (separation.current > 0 ? config.camera.exploded : config.camera.assembled) : undefined
      if (pose) {
        element.cameraOrbit = orbitFor(pose)
        element.cameraTarget = targetFor(pose)
      }
    }
    const onError = () => {
      window.clearTimeout(timeout)
      clearHover()
      setSelectedIngredient(null)
      if (motion.current !== null) cancelAnimationFrame(motion.current)
      motion.current = null
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
    element.addEventListener('camera-change', clearHover)
    if (element.loaded) onLoad()
    return () => {
      window.clearTimeout(timeout)
      availabilityObserver.disconnect()
      element.removeEventListener('load', onLoad)
      element.removeEventListener('error', onError)
      element.removeEventListener('progress', onProgress)
      element.removeEventListener('ar-status', onARStatus)
      element.removeEventListener('camera-change', clearHover)
    }
  }, [attempt, config.animation?.name])

  useEffect(() => {
    if (viewer.current) viewer.current.autoRotate = rotating
  }, [rotating, attempt])

  useEffect(() => () => {
    if (motion.current !== null) cancelAnimationFrame(motion.current)
    if (hoverFrame.current !== null) cancelAnimationFrame(hoverFrame.current)
    for (const { material, emission } of hover.current.originals) material.setEmissiveFactor(emission)
  }, [])

  async function activateAR() {
    if (!viewer.current || !loaded || !canAR) return
    clearHover()
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
    clearHover()
    setSelectedIngredient(null)
    if (motion.current !== null) cancelAnimationFrame(motion.current)
    motion.current = null
    separation.current = expanded ? 1 : 0
    if (config.animation) viewer.current.currentTime = viewer.current.duration * Math.min(separation.current, .999999)
    setRotating(false)
    const pose = config.camera ? (expanded ? config.camera.exploded : config.camera.assembled) : undefined
    if (pose) {
      viewer.current.cameraOrbit = orbitFor(pose)
      viewer.current.cameraTarget = targetFor(pose)
      viewer.current.fieldOfView = `${config.camera!.fieldOfViewDeg}deg`
    } else {
      // No authored framing: hand control back to model-viewer's auto frame.
      viewer.current.cameraOrbit = 'auto auto auto'
      viewer.current.cameraTarget = 'auto auto auto'
      viewer.current.fieldOfView = 'auto'
    }
    viewer.current.resetTurntableRotation()
  }

  function retry() {
    clearHover()
    setSelectedIngredient(null)
    if (motion.current !== null) cancelAnimationFrame(motion.current)
    motion.current = null
    separation.current = expanded ? 1 : 0
    setFailed(false)
    setLoaded(false)
    setCanAR(false)
    setProgress(0)
    setRotating(false)
    setAttempt(value => value + 1)
  }

  const availability = !loaded && !failed
    ? 'Comprobando si tu dispositivo puede abrir AR…'
    : !window.isSecureContext
      ? 'La realidad aumentada necesita una conexión segura (HTTPS). Mientras tanto, puedes girarlo aquí.'
      : 'Para ponerlo en tu mesa, abre esta carta en Safari (iPhone) o Chrome (Android). Aquí puedes girarlo en 3D.'

  const actions = (
    <div className={canAR ? 'ar-live' : 'ar-quiet'}>
      {canAR ? (
        <Button className="primary-button ar-button" disabled={!loaded || failed || launching} onClick={activateAR}>
          {launching ? <LoaderCircle className="loading-spinner" aria-hidden="true" /> : <ScanLine aria-hidden="true" />}
          {launching ? 'Abriendo AR…' : 'Ver en mi mesa'}
          {!launching && <ArrowUpRight size={17} strokeWidth={2} aria-hidden="true" />}
        </Button>
      ) : (
        <p className="ar-note">
          <Smartphone size={15} aria-hidden="true" />
          {availability}
        </p>
      )}
      {arMessage && <p className="ar-message" role="status">{arMessage}</p>}
    </div>
  )

  return (
    <div className="product-layout">
      <section className="product-stage" aria-label={`Vista 3D de ${dish.name}`}>
        <span className="stage-caption eyebrow">
          <Box size={14} aria-hidden="true" /> {expanded ? (config.labels.explodedCaption ?? config.labels.assembledCaption) : config.labels.assembledCaption}
        </span>
        <model-viewer
          key={attempt}
          ref={viewer}
          src={attempt === 0 ? config.model : `${config.model}${config.model.includes('?') ? '&' : '?'}retry=${attempt}`}
          ios-src={expanded && config.ios.exploded ? config.ios.exploded : config.ios.assembled}
          animation-name={config.animation?.name}
          poster={dish.poster}
          onPointerDown={event => {
            pointer.current = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY, id: event.pointerId, dragged: false } : null
            clearHover()
          }}
          onPointerMove={movePointer}
          onPointerLeave={clearHover}
          onPointerUp={pickIngredient}
          onPointerCancel={() => { pointer.current = null; clearHover() }}
          alt={config.alt}
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="fixed"
          ar-placement="floor"
          ar-usdz-max-texture-size="2048"
          camera-controls
          camera-orbit={config.camera ? orbitFor(config.camera.assembled) : undefined}
          camera-target={config.camera ? targetFor(config.camera.assembled) : undefined}
          min-camera-orbit={config.camera ? `auto 0deg ${config.camera.minRadiusM}m` : undefined}
          max-camera-orbit={config.camera ? `auto 180deg ${config.camera.maxRadiusM}m` : undefined}
          field-of-view={config.camera ? `${config.camera.fieldOfViewDeg}deg` : undefined}
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
        {hovered && !selected && (
          <span className="ingredient-hover" aria-hidden="true">
            <MousePointer2 size={15} /> Seleccionar · {hovered.label}
          </span>
        )}
        {!loaded && !failed && (
          <div className="model-loading" role="status">
            <LoaderCircle size={17} className="loading-spinner" aria-hidden="true" />
            <span>Cargando tu plato… {progress}%</span>
          </div>
        )}
        {failed && (
          <div className="model-error" role="alert">
            {dish.poster && <img src={dish.poster} alt={dish.name} />}
            <div>
              <h3>No se pudo cargar la vista 3D.</h3>
              <p>Tu plato sigue aquí. Revisa tu conexión e inténtalo de nuevo.</p>
              <Button onClick={retry} variant="outline">Reintentar <RotateCcw size={16} /></Button>
            </div>
          </div>
        )}
        {selected && (
          <div className="ingredient-card" role="status">
            <div>
              <strong>{selected.label}</strong>
              <p>{selected.description}</p>
            </div>
            <button type="button" aria-label="Cerrar información del ingrediente" onClick={() => setSelectedIngredient(null)}>
              <X size={18} />
            </button>
          </div>
        )}
      </section>

      <div className="stage-controls">
        {canExplode && (
          <Button className="explode-button" onClick={toggleSeparation} disabled={!loaded || failed} aria-pressed={expanded}>
            <Layers size={19} aria-hidden="true" />
            {expanded ? config.labels.assemble : config.labels.explode}
          </Button>
        )}
        {hasIngredients && <p className="ingredient-hint">Toca un ingrediente del modelo para descubrirlo.</p>}
        <div className="stage-bar">
          <span className="drag-hint"><Move size={15} aria-hidden="true" /> Arrastra para girar</span>
          <div className="stage-tools">
            <Button
              variant="ghost"
              size="icon"
              aria-label={rotating ? 'Pausar giro' : 'Girar automáticamente'}
              aria-pressed={rotating}
              disabled={!loaded || failed}
              onClick={() => setRotating(value => !value)}
            >
              {rotating ? <Pause /> : <Play />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Restablecer vista" disabled={!loaded || failed} onClick={resetView}>
              <RotateCcw />
            </Button>
          </div>
        </div>
      </div>

      <ProductInfo dish={dish} actions={actions} className={canAR ? 'has-live-ar' : ''} />
    </div>
  )
}
