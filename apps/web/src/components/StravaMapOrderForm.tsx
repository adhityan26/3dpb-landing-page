import { useState, type FormEvent } from 'react'

type Status = 'idle' | 'submitting' | 'success' | 'error'
type Shape = 'square' | 'rectangle' | 'circle'

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface LayerColors {
  gpxPath: string
  road: string
  water: string
  green: string
  building: string
}

const DEFAULT_COLORS: LayerColors = {
  gpxPath: '#FC4C02',
  road: '#D4C5A9',
  water: '#5BA4CF',
  green: '#8DB87A',
  building: '#B8A898',
}

export interface StravaMapStrings {
  nameLabel: string
  namePlaceholder: string
  whatsappLabel: string
  whatsappPlaceholder: string
  stravaUrlLabel: string
  stravaUrlPlaceholder: string
  stravaUrlHint: string
  sizeLabel: string
  sizeSmall: string
  sizeMedium: string
  sizeLarge: string
  shapeLabel: string
  shapeSquare: string
  shapeRectangle: string
  shapeCircle: string
  colorsLabel: string
  colorsHint: string
  layerGpxPath: string
  layerRoad: string
  layerWater: string
  layerGreen: string
  layerBuilding: string
  notesLabel: string
  notesPlaceholder: string
  submit: string
  submitting: string
  success: string
  successDownloadNote: string
  successDownload: string
  successWhatsapp: string
  errorInvalidName: string
  errorInvalidWhatsapp: string
  errorInvalidStravaUrl: string
  errorInvalidSize: string
  errorGeneric: string
}

interface Props {
  strings: StravaMapStrings
  whatsappNumber?: string
  locale: 'en' | 'id'
}

const WA_REGEX = /^(\+?62|0)[0-9]{8,13}$/
const STRAVA_REGEX = /^https:\/\/(www\.)?strava\.com\//

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border-2 border-[color:var(--color-ink-200)] shadow-sm transition-all group-hover:border-[color:var(--color-brand-400)]">
        <div className="absolute inset-0" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          title={label}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-medium leading-tight">{label}</span>
        <span className="block text-xs text-[color:var(--color-ink-400)] font-mono">{value.toUpperCase()}</span>
      </div>
    </label>
  )
}

const SHAPE_OPTIONS: { value: Shape; icon: string }[] = [
  {
    value: 'square',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="32" height="32" rx="2" stroke="currentColor" stroke-width="2.5"/></svg>`,
  },
  {
    value: 'rectangle',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="10" width="36" height="20" rx="2" stroke="currentColor" stroke-width="2.5"/></svg>`,
  },
  {
    value: 'circle',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="16" stroke="currentColor" stroke-width="2.5"/></svg>`,
  },
]

export default function StravaMapOrderForm({ strings, whatsappNumber, locale }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [projectJson, setProjectJson] = useState<Record<string, unknown> | null>(null)
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [stravaUrl, setStravaUrl] = useState('')
  const [size, setSize] = useState('')
  const [shape, setShape] = useState<Shape>('square')
  const [colors, setColors] = useState<LayerColors>({ ...DEFAULT_COLORS })
  const [notes, setNotes] = useState('')

  function setColor(key: keyof LayerColors, value: string) {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage('')

    if (!name.trim()) { setStatus('error'); setErrorMessage(strings.errorInvalidName); return }
    if (!WA_REGEX.test(whatsapp.trim())) { setStatus('error'); setErrorMessage(strings.errorInvalidWhatsapp); return }
    if (!STRAVA_REGEX.test(stravaUrl.trim())) { setStatus('error'); setErrorMessage(strings.errorInvalidStravaUrl); return }
    if (!size) { setStatus('error'); setErrorMessage(strings.errorInvalidSize); return }

    setStatus('submitting')
    try {
      const res = await fetch('/api/strava-map-order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          stravaUrl: stravaUrl.trim(),
          size,
          shape,
          colors,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        const map: Record<string, string> = {
          invalid_name: strings.errorInvalidName,
          invalid_whatsapp: strings.errorInvalidWhatsapp,
          invalid_strava_url: strings.errorInvalidStravaUrl,
          invalid_size: strings.errorInvalidSize,
        }
        setStatus('error')
        setErrorMessage(map[body.error ?? ''] ?? strings.errorGeneric)
        return
      }
      const responseBody = (await res.json()) as { ok: boolean; projectJson?: Record<string, unknown> }
      if (responseBody.projectJson) {
        const safeName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        downloadJson(responseBody.projectJson, `map2model-${safeName}.json`)
        setProjectJson(responseBody.projectJson)
      }
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMessage(strings.errorGeneric)
    }
  }

  if (status === 'success') {
    const waMsg = locale === 'id'
      ? `Halo, saya sudah order Strava Map 3D Print atas nama ${name}. Link Strava: ${stravaUrl}`
      : `Hi, I just submitted a Strava Map 3D Print order under the name ${name}. Strava link: ${stravaUrl}`
    const waHref = whatsappNumber
      ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMsg)}`
      : undefined
    const safeName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    return (
      <div role="status" aria-live="polite" className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="text-3xl">🎉</div>
        <p className="text-lg font-semibold text-green-800">{strings.success}</p>
        <p className="text-sm text-green-700">{strings.successDownloadNote}</p>
        <div className="flex flex-col gap-2">
          {projectJson && (
            <button
              type="button"
              onClick={() => downloadJson(projectJson, `map2model-${safeName}.json`)}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-green-700 bg-white px-6 py-2.5 font-medium text-green-700 hover:bg-green-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              {strings.successDownload}
            </button>
          )}
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener"
              className="inline-block rounded-full bg-[#25D366] px-6 py-2.5 font-medium text-white hover:opacity-90"
            >
              {strings.successWhatsapp}
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>

      {/* Name + WhatsApp */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{strings.nameLabel} *</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder={strings.namePlaceholder}
            className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{strings.whatsappLabel} *</span>
          <input
            type="tel"
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.currentTarget.value)}
            placeholder={strings.whatsappPlaceholder}
            className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none"
          />
        </label>
      </div>

      {/* Strava URL */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{strings.stravaUrlLabel} *</span>
        <input
          type="url"
          required
          value={stravaUrl}
          onChange={(e) => setStravaUrl(e.currentTarget.value)}
          placeholder={strings.stravaUrlPlaceholder}
          className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none"
        />
        <span className="mt-1 block text-xs text-[color:var(--color-ink-400)]">{strings.stravaUrlHint}</span>
      </label>

      {/* Size */}
      <fieldset>
        <legend className="mb-2 block text-sm font-medium">{strings.sizeLabel} *</legend>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['small', strings.sizeSmall],
            ['medium', strings.sizeMedium],
            ['large', strings.sizeLarge],
          ] as const).map(([val, label]) => (
            <label
              key={val}
              className={`cursor-pointer rounded-xl border-2 p-3 text-center text-sm transition-colors ${
                size === val
                  ? 'border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)] font-semibold text-[color:var(--color-brand-600)]'
                  : 'border-[color:var(--color-ink-200)] hover:border-[color:var(--color-ink-400)]'
              }`}
            >
              <input type="radio" name="size" value={val} checked={size === val} onChange={() => setSize(val)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Shape */}
      <fieldset>
        <legend className="mb-2 block text-sm font-medium">{strings.shapeLabel}</legend>
        <div className="grid grid-cols-3 gap-2">
          {SHAPE_OPTIONS.map(({ value, icon }) => {
            const label = value === 'square' ? strings.shapeSquare : value === 'rectangle' ? strings.shapeRectangle : strings.shapeCircle
            return (
              <label
                key={value}
                className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-colors ${
                  shape === value
                    ? 'border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-600)]'
                    : 'border-[color:var(--color-ink-200)] text-[color:var(--color-ink-500)] hover:border-[color:var(--color-ink-400)]'
                }`}
              >
                <input type="radio" name="shape" value={value} checked={shape === value} onChange={() => setShape(value)} className="sr-only" />
                <span className="mx-auto mb-1 block h-8 w-8" dangerouslySetInnerHTML={{ __html: icon }} />
                <span className="text-xs font-medium">{label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* Layer Colors */}
      <fieldset>
        <legend className="mb-0.5 block text-sm font-medium">{strings.colorsLabel}</legend>
        <p className="mb-3 text-xs text-[color:var(--color-ink-400)]">{strings.colorsHint}</p>
        <div className="rounded-xl border border-[color:var(--color-ink-200)] divide-y divide-[color:var(--color-ink-100)]">
          {(
            [
              ['gpxPath', strings.layerGpxPath],
              ['road', strings.layerRoad],
              ['water', strings.layerWater],
              ['green', strings.layerGreen],
              ['building', strings.layerBuilding],
            ] as [keyof LayerColors, string][]
          ).map(([key, label]) => (
            <div key={key} className="px-4 py-3">
              <ColorSwatch label={label} value={colors[key]} onChange={(v) => setColor(key, v)} />
            </div>
          ))}
        </div>
      </fieldset>

      {/* Notes */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{strings.notesLabel}</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          placeholder={strings.notesPlaceholder}
          rows={2}
          className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none"
        />
      </label>

      {status === 'error' && (
        <p role="alert" className="text-sm text-red-600">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-full bg-[color:var(--color-brand-500)] px-5 py-3 font-semibold text-white hover:bg-[color:var(--color-brand-600)] disabled:opacity-60"
      >
        {status === 'submitting' ? strings.submitting : strings.submit}
      </button>
    </form>
  )
}
