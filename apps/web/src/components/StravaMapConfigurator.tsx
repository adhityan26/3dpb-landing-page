import { useState, useEffect, useRef, useCallback } from 'react'
import type { Circle, Map as LMap, Marker, Polyline, Rectangle } from 'leaflet'
import { parseGpx, coordsToGeoJson, getBounds } from '~/lib/polyline'
import type { StravaActivity } from '../pages/api/strava/activities'

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'connect' | 'pick' | 'map' | 'contact' | 'submitting' | 'success'
type Shape = 'square' | 'rectangle' | 'circle' | 'hexagon'
type Layer = 'road' | 'water' | 'green' | 'building'
type RouteCoords = [number, number][] // [lat, lng]

interface LayerColors {
  gpxPath: string; road: string; water: string; green: string; building: string
}

const DEFAULT_COLORS: LayerColors = {
  gpxPath: '#FC4C02', road: '#D4C5A9', water: '#5BA4CF', green: '#8DB87A', building: '#B8A898',
}

const ALL_LAYERS: Layer[] = ['road', 'water', 'green', 'building']

export interface StravaMapStrings {
  stepInput: string; stepMap: string; stepContact: string
  connectTitle: string; connectDesc: string; connectButton: string
  orDivider: string; gpxLabel: string; gpxHint: string
  pickTitle: string; pickHint: string; loadingActivities: string
  activityLoadError: string; reconnectButton: string
  loadingRoute: string; gpxParseError: string
  shapeLabel: string; shapeSquare: string; shapeRectangle: string; shapeCircle: string; shapeHexagon: string
  layersLabel: string; layersHint: string
  layerGpx: string; layerRoad: string; layerWater: string; layerGreen: string; layerBuilding: string
  sizeLabel: string; sizeSmall: string; sizeMedium: string; sizeLarge: string
  nextButton: string; backButton: string
  nameLabel: string; namePlaceholder: string
  whatsappLabel: string; whatsappPlaceholder: string
  notesLabel: string; notesPlaceholder: string
  submitButton: string; submitting: string
  success: string; successSub: string
  errorInvalidName: string; errorInvalidWhatsapp: string; errorGeneric: string
}

interface Props {
  strings: StravaMapStrings
  locale: 'en' | 'id'
  whatsappNumber?: string
  stravaConnectUrl: string
  stravaConnected: boolean
  stravaError?: string
}

const WA_REGEX = /^(\+?62|0)[0-9]{8,13}$/

// ── ColorSwatch ──────────────────────────────────────────────────────────────

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border-2 border-[color:var(--color-ink-200)] shadow-sm">
        <div className="absolute inset-0" style={{ backgroundColor: value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.currentTarget.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </div>
      <span className="text-sm font-medium">{label}</span>
      <span className="ml-auto font-mono text-xs text-[color:var(--color-ink-400)]">{value.toUpperCase()}</span>
    </label>
  )
}

// ── Area polygon helper ───────────────────────────────────────────────────────
// Converts the interactive shape position to a GeoJSON Polygon.
// GeoJSON uses [lng, lat] order; Leaflet/shapePosRef uses [lat, lng].

function computeAreaPolygon(
  pos: { center: [number, number]; latHalf: number; lngHalf: number },
  sh: Shape
): Record<string, unknown> {
  const { center, latHalf, lngHalf } = pos
  let ring: [number, number][]

  if (sh === 'circle') {
    const half = Math.max(latHalf, lngHalf)
    ring = Array.from({ length: 64 }, (_, i) => {
      const rad = (i * 2 * Math.PI) / 64
      return [center[1] + half * Math.cos(rad), center[0] + half * Math.sin(rad)] as [number, number]
    })
    ring.push(ring[0])
  } else if (sh === 'square') {
    const half = Math.max(latHalf, lngHalf)
    ring = [
      [center[1] - half, center[0] - half],
      [center[1] + half, center[0] - half],
      [center[1] + half, center[0] + half],
      [center[1] - half, center[0] + half],
      [center[1] - half, center[0] - half],
    ]
  } else if (sh === 'hexagon') {
    const half = Math.max(latHalf, lngHalf)
    ring = [0, 60, 120, 180, 240, 300].map((deg) => {
      const rad = (deg * Math.PI) / 180
      return [center[1] + half * Math.cos(rad), center[0] + half * Math.sin(rad)] as [number, number]
    })
    ring.push(ring[0])
  } else {
    // rectangle — independent axes
    ring = [
      [center[1] - lngHalf, center[0] - latHalf],
      [center[1] + lngHalf, center[0] - latHalf],
      [center[1] + lngHalf, center[0] + latHalf],
      [center[1] - lngHalf, center[0] + latHalf],
      [center[1] - lngHalf, center[0] - latHalf],
    ]
  }

  return { type: 'Polygon', coordinates: [ring] }
}

// ── MapPanel ─────────────────────────────────────────────────────────────────
// Interactive print-area overlay with draggable move + resize handles.
// Uses refs (not state) for the mutable shape position so drag events don't
// trigger React re-renders on every frame.

function MapPanel({ coords, shape, gpxColor, onAreaChange }: {
  coords: RouteCoords; shape: Shape; gpxColor: string
  onAreaChange?: (polygon: Record<string, unknown>) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LMap | null>(null)
  const LRef = useRef<typeof import('leaflet') | null>(null)
  const routeRef = useRef<Polyline | null>(null)
  const shapeRef = useRef<Rectangle | Circle | null>(null)
  const moveHandleRef = useRef<Marker | null>(null)
  const resizeHandleRef = useRef<Marker | null>(null)
  // Mutable shape position — mutated directly during drag, never triggers render
  const shapePosRef = useRef<{ center: [number, number]; latHalf: number; lngHalf: number } | null>(null)
  const shapeTypeRef = useRef<Shape>(shape)
  const [mapReady, setMapReady] = useState(false)

  // Keep shapeTypeRef in sync so drag handlers always see the current shape type
  useEffect(() => { shapeTypeRef.current = shape }, [shape])

  // Redraws only the shape vector layer and repositions the resize handle.
  // Called on every drag event and on shape-type changes. Does NOT recreate
  // the draggable marker handles (that would break the ongoing drag gesture).
  function redrawShapeLayer(L: typeof import('leaflet'), map: LMap, sh: Shape) {
    const pos = shapePosRef.current
    if (!pos) return
    const { center, latHalf, lngHalf } = pos
    const opts = { color: '#3b82f6', weight: 2, fillOpacity: 0.1, dashArray: '6 4', interactive: false }

    shapeRef.current?.remove()
    shapeRef.current = null

    let resizePos: [number, number]
    if (sh === 'circle') {
      const half = Math.max(latHalf, lngHalf)
      shapeRef.current = L.circle(center, { radius: half * 111320, ...opts }).addTo(map) as unknown as Circle
      resizePos = [center[0], center[1] + half]
    } else if (sh === 'square') {
      const half = Math.max(latHalf, lngHalf)
      shapeRef.current = L.rectangle(
        [[center[0] - half, center[1] - half], [center[0] + half, center[1] + half]], opts
      ).addTo(map) as unknown as Rectangle
      resizePos = [center[0] - half, center[1] + half]
    } else if (sh === 'hexagon') {
      const half = Math.max(latHalf, lngHalf)
      // Flat-top regular hexagon: vertices at 0°, 60°, 120°, 180°, 240°, 300°
      const vertices: [number, number][] = [0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180
        return [center[0] + half * Math.sin(rad), center[1] + half * Math.cos(rad)]
      })
      shapeRef.current = L.polygon(vertices, opts).addTo(map) as unknown as Rectangle
      resizePos = [center[0], center[1] + half] // rightmost vertex
    } else {
      shapeRef.current = L.rectangle(
        [[center[0] - latHalf, center[1] - lngHalf], [center[0] + latHalf, center[1] + lngHalf]], opts
      ).addTo(map) as unknown as Rectangle
      resizePos = [center[0] - latHalf, center[1] + lngHalf]
    }
    // Reposition resize handle to match new shape; move handle is at its own dragged position
    resizeHandleRef.current?.setLatLng(resizePos)
  }

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let mounted = true
    ;(async () => {
      const L = await import('leaflet')
      if (!mounted || !containerRef.current || mapRef.current) return
      LRef.current = L
      const map = L.map(containerRef.current, { zoomControl: true })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map)
      mapRef.current = map
      map.invalidateSize()
      setMapReady(true)
    })()
    return () => { mounted = false }
  }, [])

  // Draw route + set up interactive handles whenever coords change
  useEffect(() => {
    if (!mapReady || !mapRef.current || !coords.length) return
    const L = LRef.current!
    const map = mapRef.current

    // Route polyline
    routeRef.current?.remove(); routeRef.current = null
    const polyline = L.polyline(coords.map(([lat, lng]) => L.latLng(lat, lng)), {
      color: gpxColor, weight: 3, opacity: 0.9,
    }).addTo(map)
    routeRef.current = polyline
    map.fitBounds(polyline.getBounds(), { padding: [40, 40] })

    // Initialise mutable shape position from route bounding box
    const b = getBounds(coords)
    shapePosRef.current = {
      center: [(b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2],
      latHalf: (b.maxLat - b.minLat) / 2,
      lngHalf: (b.maxLng - b.minLng) / 2,
    }

    // Tear down old handles before re-creating
    moveHandleRef.current?.remove(); moveHandleRef.current = null
    resizeHandleRef.current?.remove(); resizeHandleRef.current = null

    const pos = shapePosRef.current

    // ── Move handle — blue circle at shape center ──────────────────────────
    const moveIcon = L.divIcon({
      className: '',
      html: '<div style="width:28px;height:28px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:white;font-size:15px;cursor:move;line-height:1;touch-action:none;user-select:none;">✥</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
    const moveMarker = L.marker(pos.center, { icon: moveIcon, draggable: true, zIndexOffset: 1000 }).addTo(map)
    moveMarker.on('drag', () => {
      const ll = moveMarker.getLatLng()
      shapePosRef.current!.center = [ll.lat, ll.lng]
      redrawShapeLayer(L, map, shapeTypeRef.current)
    })
    moveHandleRef.current = moveMarker

    // ── Resize handle — white square at bottom-right corner / right edge ───
    const resizeIcon = L.divIcon({
      className: '',
      html: '<div style="width:18px;height:18px;border-radius:3px;background:white;border:2.5px solid #3b82f6;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:nwse-resize;touch-action:none;"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
    const resizeMarker = L.marker(
      [pos.center[0] - pos.latHalf, pos.center[1] + pos.lngHalf],
      { icon: resizeIcon, draggable: true, zIndexOffset: 1000 }
    ).addTo(map)
    resizeMarker.on('drag', () => {
      const ll = resizeMarker.getLatLng()
      const p = shapePosRef.current!
      const sh = shapeTypeRef.current
      const dlat = Math.max(Math.abs(ll.lat - p.center[0]), 0.0001)
      const dlng = Math.max(Math.abs(ll.lng - p.center[1]), 0.0001)
      // Square, circle, hexagon stay uniform; rectangle allows independent axes
      p.latHalf = (sh === 'square' || sh === 'circle' || sh === 'hexagon') ? Math.max(dlat, dlng) : dlat
      p.lngHalf = (sh === 'square' || sh === 'circle' || sh === 'hexagon') ? Math.max(dlat, dlng) : dlng
      redrawShapeLayer(L, map, sh)
    })
    resizeHandleRef.current = resizeMarker

    redrawShapeLayer(L, map, shapeTypeRef.current)
    // Emit initial polygon so parent has a value before the user drags anything
    if (shapePosRef.current) onAreaChange?.(computeAreaPolygon(shapePosRef.current, shapeTypeRef.current))

    // Update polygon after drag ends (not on every drag frame)
    moveMarker.on('dragend', () => {
      if (shapePosRef.current) onAreaChange?.(computeAreaPolygon(shapePosRef.current, shapeTypeRef.current))
    })
    resizeMarker.on('dragend', () => {
      if (shapePosRef.current) onAreaChange?.(computeAreaPolygon(shapePosRef.current, shapeTypeRef.current))
    })
  }, [mapReady, coords, gpxColor]) // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw shape layer when shape type changes (handles stay in place)
  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current || !shapePosRef.current) return
    // Snap stored halves to equal when switching to square/circle/hexagon
    if (shape === 'square' || shape === 'circle' || shape === 'hexagon') {
      const half = Math.max(shapePosRef.current.latHalf, shapePosRef.current.lngHalf)
      shapePosRef.current.latHalf = half
      shapePosRef.current.lngHalf = half
    }
    redrawShapeLayer(LRef.current, mapRef.current, shape)
    onAreaChange?.(computeAreaPolygon(shapePosRef.current, shape))
  }, [mapReady, shape]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="h-full w-full rounded-xl" style={{ minHeight: '300px' }} />
}

// ── Activity Card ─────────────────────────────────────────────────────────────

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const SPORT_ICON: Record<string, string> = {
  Run: '🏃', Ride: '🚴', Hike: '🥾', Walk: '🚶', Swim: '🏊', Ski: '⛷️',
  VirtualRide: '🚴', VirtualRun: '🏃',
}

// ── Main Configurator ─────────────────────────────────────────────────────────

export default function StravaMapConfigurator({ strings, locale, whatsappNumber, stravaConnectUrl, stravaConnected, stravaError }: Props) {
  const [step, setStep] = useState<Step>(stravaConnected ? 'pick' : 'connect')
  // Track how the customer provided their route so the back button in 'map' goes to the right step
  const [inputSource, setInputSource] = useState<'gpx' | 'strava'>(stravaConnected ? 'strava' : 'gpx')
  const [activities, setActivities] = useState<StravaActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(stravaConnected)
  const [activitiesError, setActivitiesError] = useState('')
  const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [coords, setCoords] = useState<RouteCoords>([])
  const [geoJson, setGeoJson] = useState<Record<string, unknown> | null>(null)
  const [areaPolygon, setAreaPolygon] = useState<Record<string, unknown> | null>(null)
  const [shape, setShape] = useState<Shape>('square')
  const [enabledLayers, setEnabledLayers] = useState<Set<Layer>>(new Set(['road', 'water', 'green']))
  const [colors, setColors] = useState<LayerColors>({ ...DEFAULT_COLORS })
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [notes, setNotes] = useState('')
  const [contactError, setContactError] = useState('')
  const [orderId, setOrderId] = useState('')

  const setColor = useCallback((key: keyof LayerColors, val: string) => {
    setColors((p) => ({ ...p, [key]: val }))
  }, [])

  // Fetch activities list after connect
  useEffect(() => {
    if (!stravaConnected) return
    ;(async () => {
      try {
        const res = await fetch('/api/strava/activities')
        if (res.status === 401) {
          setActivitiesError('reconnect')
          setActivitiesLoading(false)
          return
        }
        const data = (await res.json()) as StravaActivity[]
        setActivities(data)
      } catch {
        setActivitiesError('fetch_failed')
      } finally {
        setActivitiesLoading(false)
      }
    })()
  }, [stravaConnected])

  // Load GPS streams when activity is selected
  async function handlePickActivity(activity: StravaActivity) {
    setSelectedActivity(activity)
    setInputSource('strava')
    setRouteLoading(true)
    try {
      const res = await fetch(`/api/strava/activity/${activity.id}`)
      if (!res.ok) throw new Error('stream fetch failed')
      const data = (await res.json()) as { coordinates: RouteCoords }
      setCoords(data.coordinates)
      setGeoJson(coordsToGeoJson(data.coordinates))
      setStep('map')
    } catch {
      setActivitiesError('stream_failed')
    } finally {
      setRouteLoading(false)
    }
  }

  // GPX upload — primary input for bazar customers
  async function handleGpxFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0]
    if (!file) return
    setInputSource('gpx')
    setRouteLoading(true)
    try {
      const text = await file.text()
      const parsed = parseGpx(text)
      setCoords(parsed)
      setGeoJson(coordsToGeoJson(parsed))
      setStep('map')
    } catch {
      setActivitiesError(strings.gpxParseError)
    } finally {
      setRouteLoading(false)
    }
  }

  function toggleLayer(layer: Layer) {
    setEnabledLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layer)) { next.delete(layer) } else if (next.size < 3) { next.add(layer) }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setContactError('')
    if (!name.trim()) { setContactError(strings.errorInvalidName); return }
    if (!WA_REGEX.test(whatsapp.trim())) { setContactError(strings.errorInvalidWhatsapp); return }
    setStep('submitting')
    try {
      const res = await fetch('/api/strava-map-order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          stravaUrl: selectedActivity
            ? `https://www.strava.com/activities/${selectedActivity.id}`
            : 'https://www.strava.com/activities/manual',
          size, shape,
          enabledLayers: [...enabledLayers],
          colors,
          gpxGeoJson: geoJson,
          areaPolygon,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('submit failed')
      const data = (await res.json()) as { ok: boolean; id?: string }
      setOrderId(data.id ?? '')
      setStep('success')
    } catch {
      setContactError(strings.errorGeneric)
      setStep('contact')
    }
  }

  // ── Breadcrumb ────────────────────────────────────────────────────────────

  const STEPS: Step[] = ['connect', 'pick', 'map', 'contact']
  const STEP_LABELS = [strings.stepInput, strings.stepInput, strings.stepMap, strings.stepContact]
  const stepIdx = STEPS.indexOf(['submitting', 'success'].includes(step) ? 'contact' : step as Step)

  // ── Success ───────────────────────────────────────────────────────────────

  if (step === 'success') {
    const orderRef = orderId ? ` (ID: ${orderId})` : ''
    const waMsg = locale === 'id'
      ? `Halo, saya sudah order Strava Map 3D Print atas nama ${name}${orderRef}.`
      : `Hi, I just submitted a Strava Map 3D Print order under the name ${name}${orderRef}.`
    const waHref = whatsappNumber
      ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMsg)}`
      : undefined
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-display font-bold">{strings.success}</h2>
        <p className="max-w-sm text-[color:var(--color-ink-500)]">{strings.successSub}</p>
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener"
            className="mt-2 inline-block rounded-full bg-[#25D366] px-8 py-3 font-semibold text-white hover:opacity-90">
            WhatsApp
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        {[strings.stepInput, strings.stepMap, strings.stepContact].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-[color:var(--color-ink-300)]">›</span>}
            <span className={i === Math.min(stepIdx, 2) ? 'font-semibold text-[color:var(--color-brand-600)]' : 'text-[color:var(--color-ink-400)]'}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step: Connect ───────────────────────────────────────────────── */}
      {step === 'connect' && (
        <div className="space-y-6">
          {stravaError && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {stravaError === 'denied'
                ? (locale === 'id' ? 'Kamu menolak akses Strava. Coba lagi.' : 'Strava access was denied. Try again.')
                : (locale === 'id' ? 'Gagal koneksi ke Strava. Coba lagi.' : 'Failed to connect to Strava. Try again.')}
            </div>
          )}

          {/* GPX upload — primary action */}
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[color:var(--color-ink-300)] p-8 text-sm text-[color:var(--color-ink-500)] hover:border-[color:var(--color-brand-400)] hover:text-[color:var(--color-brand-600)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-8 w-8">
              <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            <span className="font-semibold text-base">{strings.gpxLabel}</span>
            <span className="text-center text-xs">{strings.gpxHint}</span>
            {routeLoading && <span className="text-xs text-[color:var(--color-brand-500)]">{strings.loadingRoute}</span>}
            <input type="file" accept=".gpx" onChange={handleGpxFile} className="sr-only" disabled={routeLoading} />
          </label>

          {/* How to export from Strava */}
          <div className="rounded-lg bg-[color:var(--color-ink-50)] px-4 py-3 text-xs text-[color:var(--color-ink-500)]">
            <p className="font-medium mb-1">
              {locale === 'id' ? 'Cara export GPX dari Strava:' : 'How to export GPX from Strava:'}
            </p>
            <ol className="list-decimal list-inside space-y-0.5">
              {locale === 'id' ? (
                <>
                  <li>Buka Strava → pilih aktivitas</li>
                  <li>Ketuk ⋮ (tiga titik) → <strong>Export GPX</strong></li>
                  <li>Upload file di sini</li>
                </>
              ) : (
                <>
                  <li>Open Strava → select your activity</li>
                  <li>Tap ⋮ (three dots) → <strong>Export GPX</strong></li>
                  <li>Upload the file here</li>
                </>
              )}
            </ol>
          </div>

          {/* Strava OAuth — secondary, for users who prefer it */}
          <details className="group">
            <summary className="cursor-pointer list-none text-center text-xs text-[color:var(--color-ink-400)] hover:text-[color:var(--color-ink-700)]">
              <span className="group-open:hidden">
                {locale === 'id' ? '▸ atau hubungkan langsung ke Strava' : '▸ or connect directly with Strava'}
              </span>
              <span className="hidden group-open:inline">
                {locale === 'id' ? '▾ sembunyikan' : '▾ collapse'}
              </span>
            </summary>
            <div className="mt-4 rounded-xl border-2 border-[#FC4C02]/20 bg-[#FC4C02]/5 p-5 text-center">
              <h3 className="mb-1 font-display font-bold">{strings.connectTitle}</h3>
              <p className="mb-4 text-xs text-[color:var(--color-ink-500)]">{strings.connectDesc}</p>
              <a
                href={stravaConnectUrl}
                className="inline-flex items-center gap-2 rounded-full bg-[#FC4C02] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e04302]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h-5.67z"/>
                </svg>
                {strings.connectButton}
              </a>
            </div>
          </details>
        </div>
      )}

      {/* ── Step: Pick Activity ─────────────────────────────────────────── */}
      {step === 'pick' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-bold">{strings.pickTitle}</h3>
            <p className="text-sm text-[color:var(--color-ink-400)]">{strings.pickHint}</p>
          </div>

          {activitiesLoading && (
            <div className="flex items-center justify-center py-12 text-sm text-[color:var(--color-ink-400)]">
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {strings.loadingActivities}
            </div>
          )}

          {activitiesError === 'reconnect' && (
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
              <p className="mb-3">{strings.activityLoadError}</p>
              <a href={stravaConnectUrl} className="font-semibold text-[#FC4C02] hover:underline">
                {strings.reconnectButton}
              </a>
            </div>
          )}

          {!activitiesLoading && !activitiesError && activities.length === 0 && (
            <p className="py-8 text-center text-sm text-[color:var(--color-ink-400)]">
              {locale === 'id' ? 'Tidak ada aktivitas GPS ditemukan.' : 'No GPS activities found.'}
            </p>
          )}

          {routeLoading && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-[color:var(--color-ink-50)] py-6 text-sm">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {strings.loadingRoute}
            </div>
          )}

          {!activitiesLoading && !routeLoading && (
            <ul className="divide-y divide-[color:var(--color-ink-100)] rounded-xl border border-[color:var(--color-ink-200)]">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <button
                    type="button"
                    onClick={() => handlePickActivity(activity)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[color:var(--color-ink-50)]"
                  >
                    <span className="text-2xl">{SPORT_ICON[activity.sport_type] ?? SPORT_ICON[activity.type] ?? '📍'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{activity.name}</p>
                      <p className="text-xs text-[color:var(--color-ink-400)]">
                        {formatDate(activity.start_date_local)} · {formatDistance(activity.distance)}
                      </p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-[color:var(--color-ink-300)]">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button type="button" onClick={() => setStep('connect')}
            className="text-sm text-[color:var(--color-ink-400)] hover:text-[color:var(--color-ink-700)]">
            ← {strings.backButton}
          </button>
        </div>
      )}

      {/* ── Step: Map + Config ──────────────────────────────────────────── */}
      {step === 'map' && (
        <div className="space-y-5">
          {selectedActivity && (
            <div className="flex items-center gap-2 rounded-lg bg-[color:var(--color-ink-50)] px-3 py-2 text-sm">
              <span>{SPORT_ICON[selectedActivity.sport_type] ?? '📍'}</span>
              <span className="font-medium">{selectedActivity.name}</span>
              <span className="text-[color:var(--color-ink-400)]">· {formatDistance(selectedActivity.distance)}</span>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-[color:var(--color-ink-200)]" style={{ height: '320px' }}>
            <MapPanel coords={coords} shape={shape} gpxColor={colors.gpxPath} onAreaChange={setAreaPolygon} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Size */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{strings.sizeLabel}</legend>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map((val) => (
                  <label key={val} className={`cursor-pointer rounded-xl border-2 p-2 text-center text-xs transition-colors ${size === val ? 'border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)] font-semibold text-[color:var(--color-brand-600)]' : 'border-[color:var(--color-ink-200)] hover:border-[color:var(--color-ink-400)]'}`}>
                    <input type="radio" name="size" value={val} checked={size === val} onChange={() => setSize(val)} className="sr-only" />
                    {val === 'small' ? strings.sizeSmall : val === 'medium' ? strings.sizeMedium : strings.sizeLarge}
                  </label>
                ))}
              </div>
            </fieldset>
            {/* Shape */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{strings.shapeLabel}</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['square',    strings.shapeSquare,    'M3 3h14v14H3z'],
                  ['rectangle', strings.shapeRectangle, 'M1 6h18v8H1z'],
                  ['circle',    strings.shapeCircle,    'M10 3a7 7 0 100 14A7 7 0 0010 3z'],
                  ['hexagon',   strings.shapeHexagon,   'M10 2l6.93 4v8L10 18l-6.93-4V6z'],
                ] as const).map(([val, label, path]) => (
                  <label key={val} className={`cursor-pointer rounded-xl border-2 p-2 text-center transition-colors ${shape === val ? 'border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-600)]' : 'border-[color:var(--color-ink-200)] text-[color:var(--color-ink-500)] hover:border-[color:var(--color-ink-400)]'}`}>
                    <input type="radio" name="shape" value={val} checked={shape === val} onChange={() => setShape(val)} className="sr-only" />
                    <svg viewBox="0 0 20 20" fill="currentColor" className="mx-auto mb-1 h-5 w-5"><path d={path} /></svg>
                    <span className="block text-xs font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Layers */}
          <fieldset>
            <legend className="mb-1 text-sm font-medium">{strings.layersLabel}</legend>
            <p className="mb-3 text-xs text-[color:var(--color-ink-400)]">{strings.layersHint}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-3 rounded-lg bg-[color:var(--color-brand-50)] px-3 py-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]">
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span className="flex-1 text-sm font-medium text-[color:var(--color-brand-700)]">{strings.layerGpx}</span>
                <ColorSwatch label="" value={colors.gpxPath} onChange={(v) => setColor('gpxPath', v)} />
              </div>
              {ALL_LAYERS.map((layer) => {
                const label = layer === 'road' ? strings.layerRoad : layer === 'water' ? strings.layerWater : layer === 'green' ? strings.layerGreen : strings.layerBuilding
                const checked = enabledLayers.has(layer)
                const disabled = !checked && enabledLayers.size >= 3
                return (
                  <div key={layer} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${disabled ? 'opacity-40' : ''}`}>
                    <button type="button" onClick={() => toggleLayer(layer)} disabled={disabled}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${checked ? 'border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]' : 'border-[color:var(--color-ink-300)] bg-white'}`}>
                      {checked && <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <span className="flex-1 text-sm">{label}</span>
                    {checked && <ColorSwatch label="" value={colors[layer as keyof LayerColors]} onChange={(v) => setColor(layer as keyof LayerColors, v)} />}
                  </div>
                )
              })}
            </div>
          </fieldset>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(inputSource === 'strava' ? 'pick' : 'connect')}
              className="rounded-full border border-[color:var(--color-ink-300)] px-5 py-2.5 text-sm font-medium hover:bg-[color:var(--color-ink-50)]">
              {strings.backButton}
            </button>
            <button type="button" onClick={() => setStep('contact')}
              className="flex-1 rounded-full bg-[color:var(--color-brand-500)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--color-brand-600)]">
              {strings.nextButton}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Contact ───────────────────────────────────────────────── */}
      {(step === 'contact' || step === 'submitting') && (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{strings.nameLabel} *</span>
              <input type="text" required value={name} onChange={(e) => setName(e.currentTarget.value)}
                placeholder={strings.namePlaceholder}
                className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{strings.whatsappLabel} *</span>
              <input type="tel" required value={whatsapp} onChange={(e) => setWhatsapp(e.currentTarget.value)}
                placeholder={strings.whatsappPlaceholder}
                className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{strings.notesLabel}</span>
            <textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)}
              placeholder={strings.notesPlaceholder} rows={2}
              className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
          </label>
          {contactError && <p role="alert" className="text-sm text-red-600">{contactError}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('map')}
              className="rounded-full border border-[color:var(--color-ink-300)] px-5 py-2.5 text-sm font-medium hover:bg-[color:var(--color-ink-50)]">
              {strings.backButton}
            </button>
            <button type="submit" disabled={step === 'submitting'}
              className="flex-1 rounded-full bg-[color:var(--color-brand-500)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--color-brand-600)] disabled:opacity-60">
              {step === 'submitting' ? strings.submitting : strings.submitButton}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
