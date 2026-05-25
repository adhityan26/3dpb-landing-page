import { useState, useRef, useCallback } from 'react'
import type { LGShape, LGSize } from '~/lib/light-generator-types'
import { LG_SHAPES } from '~/lib/light-generator-types'
import LightGeneratorCasingCanvas from './LightGeneratorCasingCanvas'

type Step = 1 | 2 | 3 | 4
type Status = 'idle' | 'submitting' | 'success' | 'error'

interface Strings {
  step_info: string
  step_config: string
  step_upload: string
  step_review: string
  next: string
  back: string
  submit: string
  submitting: string
  info: {
    name_label: string
    name_placeholder: string
    contact_label: string
    contact_placeholder: string
    notes_label: string
    notes_placeholder: string
    notes_optional: string
  }
  config: {
    size_label: string
    size_s: string; size_s_desc: string
    size_m: string; size_m_desc: string
    size_l: string; size_l_desc: string
    shape_label: string
    shape_circle: string; shape_square: string; shape_triangle: string; shape_rect: string; shape_oval: string
    ratio_label: string; ratio_width: string; ratio_height: string
  }
  upload: {
    silhouette_label: string; silhouette_tooltip: string; silhouette_hint: string; silhouette_cta: string
    floor_label: string; floor_optional: string; floor_tooltip: string; floor_hint: string; floor_cta: string
    shadow_title: string; shadow_diameter: string; shadow_offset_x: string; shadow_offset_y: string
    preview_button: string; preview_loading: string; preview_fallback: string
    stems_label: string; stems_desc: string; stems_detecting: string; stems_fallback: string
  }
  review: {
    title: string; name: string; contact: string; notes: string
    size: string; shape: string; ratio: string; shadow: string
    stems: string; stems_yes: string; stems_no: string
    silhouette: string; floor: string; floor_none: string
  }
  success: { title: string; subtitle: string; whatsapp: string }
  error: {
    invalid_name: string; invalid_contact: string; invalid_size: string; invalid_shape: string
    invalid_silhouette: string; file_too_large: string; file_invalid_type: string; generic: string
  }
}

interface Props {
  strings: Strings
  locale: 'en' | 'id'
  whatsappNumber?: string
}

const SIZE_DATA: { value: LGSize; label: string; desc: string }[] = [
  { value: 'S', label: 'S', desc: 'Ø 10 cm' },
  { value: 'M', label: 'M', desc: 'Ø 14 cm' },
  { value: 'L', label: 'L', desc: 'Ø 20 cm' },
]

const SHAPE_ICONS: Record<LGShape, string> = {
  circle: `<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="2.5"/></svg>`,
  square: `<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" stroke-width="2.5"/></svg>`,
  triangle: `<svg viewBox="0 0 32 32" fill="none"><polygon points="16,3 30,29 2,29" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" fill="none"/></svg>`,
  rect: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="9" width="28" height="14" rx="2" stroke="currentColor" stroke-width="2.5"/></svg>`,
  oval: `<svg viewBox="0 0 32 32" fill="none"><ellipse cx="16" cy="16" rx="14" ry="9" stroke="currentColor" stroke-width="2.5"/></svg>`,
}

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function FileUploadZone({
  label, tooltip, hint, cta, optional, file, onFile, onError, errorMsgTooLarge, errorMsgInvalidType, accent,
}: {
  label: string; tooltip: string; hint: string; cta: string; optional?: string
  file: File | null; onFile: (f: File) => void; onError: (msg: string) => void
  errorMsgTooLarge: string; errorMsgInvalidType: string; accent?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [dragging, setDragging] = useState(false)

  function handleFile(f: File) {
    if (!ALLOWED_TYPES.includes(f.type)) { onError(errorMsgInvalidType); return }
    if (f.size > MAX_FILE_BYTES) { onError(errorMsgTooLarge); return }
    onFile(f)
  }

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-sm font-semibold">
          {label}
          {optional && <span className="ml-1 font-normal text-[color:var(--color-ink-400)]">{optional}</span>}
        </span>
        <div className="relative">
          <button type="button"
            onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)} onBlur={() => setShowTooltip(false)}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--color-ink-400)] text-[10px] font-bold text-white"
            aria-label="info">?</button>
          {showTooltip && (
            <div className="absolute left-6 top-[-8px] z-10 w-56 rounded-lg bg-[#1f2937] p-3 text-[11px] leading-relaxed text-white shadow-lg">
              {tooltip}
            </div>
          )}
        </div>
      </div>
      <div role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-[color:var(--color-brand-400)] bg-[color:var(--color-brand-50)]'
          : accent ? 'border-[color:var(--color-brand-400)] bg-[color:var(--color-brand-50)] hover:border-[color:var(--color-brand-500)]'
          : 'border-[color:var(--color-ink-300)] bg-[color:var(--color-ink-50)] hover:border-[color:var(--color-ink-400)]'
        }`}>
        {file ? (
          <div>
            <div className="mb-1 text-2xl">✅</div>
            <div className="text-sm font-semibold text-[color:var(--color-brand-600)]">{file.name}</div>
            <div className="mt-0.5 text-xs text-[color:var(--color-ink-400)]">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
        ) : (
          <div>
            <div className="mb-1.5 text-3xl">{accent ? '🖼️' : '📁'}</div>
            <div className={`text-sm font-semibold ${accent ? 'text-[color:var(--color-brand-600)]' : 'text-[color:var(--color-ink-500)]'}`}>{cta}</div>
            <div className="mt-0.5 text-xs text-[color:var(--color-ink-400)]">{hint}</div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

function StepIndicator({ current, labels }: { current: Step; labels: string[] }) {
  return (
    <div className="mb-6 flex items-center gap-1">
      {labels.map((label, i) => {
        const step = (i + 1) as Step
        const active = step === current
        const done = step < current
        return (
          <div key={step} className="flex items-center" style={{ flex: step < labels.length ? '1' : undefined }}>
            <div className="flex flex-col items-center">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                active ? 'bg-[color:var(--color-brand-500)] text-white'
                : done ? 'bg-[color:var(--color-brand-200)] text-[color:var(--color-brand-700)]'
                : 'bg-[color:var(--color-ink-200)] text-[color:var(--color-ink-500)]'
              }`}>{done ? '✓' : step}</div>
              <div className={`mt-1 text-[10px] font-semibold ${
                active ? 'text-[color:var(--color-brand-600)]'
                : done ? 'text-[color:var(--color-brand-400)]'
                : 'text-[color:var(--color-ink-400)]'
              }`}>{label}</div>
            </div>
            {step < labels.length && (
              <div className={`mb-4 h-0.5 flex-1 mx-1 ${done ? 'bg-[color:var(--color-brand-200)]' : 'bg-[color:var(--color-ink-200)]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function LightGeneratorOrderForm({ strings: s, locale, whatsappNumber }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [orderId, setOrderId] = useState('')

  // Step 1
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [notes, setNotes] = useState('')

  // Step 2
  const [size, setSize] = useState<LGSize | ''>('')
  const [shape, setShape] = useState<LGShape | ''>('')
  const [ratioW, setRatioW] = useState(3)
  const [ratioH, setRatioH] = useState(2)

  // Step 3
  const [silhouette, setSilhouette] = useState<File | null>(null)
  const [silhouetteUrl, setSilhouetteUrl] = useState<string | null>(null)
  const [floorInsert, setFloorInsert] = useState<File | null>(null)
  const [shadowDiameter, setShadowDiameter] = useState(15)
  const [shadowOffsetX, setShadowOffsetX] = useState(0)
  const [shadowOffsetY, setShadowOffsetY] = useState(0)
  const [supportStems, setSupportStems] = useState(false)
  const [stemsFallback, setStemsFallback] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewFallback, setPreviewFallback] = useState(false)

  const handleSilhouette = useCallback((file: File) => {
    setSilhouette(file)
    if (silhouetteUrl) URL.revokeObjectURL(silhouetteUrl)
    setSilhouetteUrl(URL.createObjectURL(file))
    setPreviewUrl(null)
    setPreviewFallback(false)
    setStemsFallback(true)
  }, [silhouetteUrl])

  async function loadShadowPreview() {
    if (!silhouette) return
    setPreviewLoading(true)
    setPreviewFallback(false)
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    try {
      const res = await fetch('/api/light-generator-shadow-preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          imageAssetId: 'pending',
          config: { diameter: shadowDiameter, offsetX: shadowOffsetX, offsetY: shadowOffsetY },
        }),
      })
      if (res.ok && res.headers.get('content-type')?.includes('image/png')) {
        const blob = await res.blob()
        setPreviewUrl(URL.createObjectURL(blob))
      } else {
        setPreviewFallback(true)
      }
    } catch {
      setPreviewFallback(true)
    } finally {
      setPreviewLoading(false)
    }
  }

  function validateStep(stepNum: Step): string {
    if (stepNum === 1) {
      if (!name.trim() || name.trim().length < 2 || name.trim().length > 100) return s.error.invalid_name
      if (!contact.trim() || contact.trim().length < 5 || contact.trim().length > 100) return s.error.invalid_contact
    }
    if (stepNum === 2) {
      if (!size) return s.error.invalid_size
      if (!shape) return s.error.invalid_shape
    }
    if (stepNum === 3) {
      if (!silhouette) return s.error.invalid_silhouette
    }
    return ''
  }

  function handleNext() {
    const err = validateStep(step)
    if (err) { setErrorMsg(err); return }
    setErrorMsg('')
    setStep((prev) => (prev + 1) as Step)
  }

  async function handleSubmit() {
    const err = validateStep(3)
    if (err) { setStep(3); setErrorMsg(err); return }
    setStatus('submitting')
    setErrorMsg('')

    const fd = new FormData()
    fd.set('name', name.trim())
    fd.set('contact', contact.trim())
    if (notes.trim()) fd.set('notes', notes.trim())
    fd.set('size', size)
    fd.set('shape', shape)
    if (shape === 'rect' || shape === 'oval') {
      fd.set('shapeRatioW', String(ratioW))
      fd.set('shapeRatioH', String(ratioH))
    }
    fd.set('shadowDiameter', String(shadowDiameter))
    fd.set('shadowOffsetX', String(shadowOffsetX))
    fd.set('shadowOffsetY', String(shadowOffsetY))
    fd.set('supportStems', String(supportStems))
    fd.set('silhouette', silhouette!)
    if (floorInsert) fd.set('floorInsert', floorInsert)

    try {
      const res = await fetch('/api/light-generator-order', { method: 'POST', body: fd })
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(s.error.generic)
        return
      }
      const body = (await res.json()) as { orderId: string }
      setOrderId(body.orderId)
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg(s.error.generic)
    }
  }

  const stepLabels = [s.step_info, s.step_config, s.step_upload, s.step_review]

  if (status === 'success') {
    const waMsg = locale === 'id'
      ? `Halo, saya baru order Light Generator dengan Order ID: ${orderId}. Nama: ${name}`
      : `Hi, I just submitted a Light Generator order. Order ID: ${orderId}. Name: ${name}`
    const waHref = whatsappNumber
      ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMsg)}`
      : undefined
    return (
      <div role="status" aria-live="polite" className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="text-4xl">🎉</div>
        <p className="text-lg font-bold text-green-800">{s.success.title}</p>
        <p className="text-sm text-green-700">{s.success.subtitle}</p>
        <p className="rounded-xl bg-white px-4 py-2 font-mono text-lg font-bold text-[color:var(--color-brand-600)] shadow-sm">{orderId}</p>
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener"
            className="inline-block rounded-full bg-[#25D366] px-6 py-2.5 font-semibold text-white hover:opacity-90">
            {s.success.whatsapp}
          </a>
        )}
      </div>
    )
  }

  return (
    <div>
      <StepIndicator current={step} labels={stepLabels} />

      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{s.info.name_label} *</span>
            <input type="text" value={name} onChange={(e) => setName(e.currentTarget.value)}
              placeholder={s.info.name_placeholder}
              className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{s.info.contact_label} *</span>
            <input type="text" value={contact} onChange={(e) => setContact(e.currentTarget.value)}
              placeholder={s.info.contact_placeholder}
              className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {s.info.notes_label} <span className="font-normal text-[color:var(--color-ink-400)]">{s.info.notes_optional}</span>
            </span>
            <textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)}
              placeholder={s.info.notes_placeholder} rows={2}
              className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{s.config.size_label} *</legend>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_DATA.map(({ value, label, desc }) => (
                <label key={value} className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-colors ${
                  size === value
                    ? 'border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)]'
                    : 'border-[color:var(--color-ink-200)] hover:border-[color:var(--color-ink-400)]'
                }`}>
                  <input type="radio" name="size" value={value} checked={size === value} onChange={() => setSize(value)} className="sr-only" />
                  <div className={`text-xl font-bold ${size === value ? 'text-[color:var(--color-brand-600)]' : ''}`}>{label}</div>
                  <div className={`text-xs ${size === value ? 'text-[color:var(--color-brand-500)]' : 'text-[color:var(--color-ink-400)]'}`}>{desc}</div>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{s.config.shape_label} *</legend>
            <div className="grid grid-cols-5 gap-2">
              {LG_SHAPES.map((shapeVal) => {
                const labelKey = `shape_${shapeVal}` as keyof typeof s.config
                return (
                  <label key={shapeVal} className={`cursor-pointer rounded-xl border-2 p-2 text-center transition-colors ${
                    shape === shapeVal
                      ? 'border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)]'
                      : 'border-[color:var(--color-ink-200)] hover:border-[color:var(--color-ink-400)]'
                  }`}>
                    <input type="radio" name="shape" value={shapeVal} checked={shape === shapeVal} onChange={() => setShape(shapeVal)} className="sr-only" />
                    <span className={`mx-auto mb-1 block h-7 w-7 ${shape === shapeVal ? 'text-[color:var(--color-brand-600)]' : 'text-[color:var(--color-ink-500)]'}`}
                      dangerouslySetInnerHTML={{ __html: SHAPE_ICONS[shapeVal] }} />
                    <span className={`text-[9px] font-medium ${shape === shapeVal ? 'text-[color:var(--color-brand-600)]' : 'text-[color:var(--color-ink-500)]'}`}>
                      {s.config[labelKey] as string}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {(shape === 'rect' || shape === 'oval') && (
            <div>
              <div className="mb-2 text-sm font-medium">{s.config.ratio_label}</div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="mb-1 text-xs text-[color:var(--color-ink-400)]">{s.config.ratio_width}</span>
                  <input type="number" min={1} max={10} value={ratioW}
                    onChange={(e) => setRatioW(parseInt(e.currentTarget.value) || 1)}
                    className="w-16 rounded-lg border border-[color:var(--color-ink-300)] px-2 py-1.5 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
                </div>
                <span className="mt-4 text-[color:var(--color-ink-400)]">×</span>
                <div className="flex flex-col">
                  <span className="mb-1 text-xs text-[color:var(--color-ink-400)]">{s.config.ratio_height}</span>
                  <input type="number" min={1} max={10} value={ratioH}
                    onChange={(e) => setRatioH(parseInt(e.currentTarget.value) || 1)}
                    className="w-16 rounded-lg border border-[color:var(--color-ink-300)] px-2 py-1.5 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <FileUploadZone
            label={s.upload.silhouette_label}
            tooltip={s.upload.silhouette_tooltip}
            hint={s.upload.silhouette_hint}
            cta={s.upload.silhouette_cta}
            file={silhouette}
            onFile={handleSilhouette}
            onError={setErrorMsg}
            errorMsgTooLarge={s.error.file_too_large}
            errorMsgInvalidType={s.error.file_invalid_type}
            accent
          />

          {silhouette && (
            <div className="mb-5">
              <LightGeneratorCasingCanvas
                silhouetteObjectUrl={silhouetteUrl}
                shape={(shape || 'circle') as LGShape}
                shapeRatio={(shape === 'rect' || shape === 'oval') ? { width: ratioW, height: ratioH } : undefined}
                shadowDiameter={shadowDiameter}
                offsetX={shadowOffsetX}
                offsetY={shadowOffsetY}
              />
            </div>
          )}

          <div className="mb-5">
            <div className="mb-2 text-sm font-medium">{s.upload.shadow_title}</div>
            <div className="grid grid-cols-3 gap-3">
              {([
                [s.upload.shadow_diameter, shadowDiameter, setShadowDiameter, 10, 200],
                [s.upload.shadow_offset_x, shadowOffsetX, setShadowOffsetX, -500, 500],
                [s.upload.shadow_offset_y, shadowOffsetY, setShadowOffsetY, -500, 500],
              ] as [string, number, (v: number) => void, number, number][]).map(([label, val, setter, min, max]) => (
                <label key={label} className="flex flex-col gap-1">
                  <span className="text-xs text-[color:var(--color-ink-500)]">{label}</span>
                  <input type="number" min={min} max={max} value={val}
                    onChange={(e) => setter(parseFloat(e.currentTarget.value) || 0)}
                    className="rounded-lg border border-[color:var(--color-ink-300)] px-2 py-1.5 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
                </label>
              ))}
            </div>
          </div>

          {silhouette && (
            <div className="mb-5">
              <button type="button" onClick={loadShadowPreview} disabled={previewLoading}
                className="rounded-full border border-[color:var(--color-brand-400)] px-4 py-1.5 text-sm text-[color:var(--color-brand-600)] hover:bg-[color:var(--color-brand-50)] disabled:opacity-50">
                {previewLoading ? s.upload.preview_loading : s.upload.preview_button}
              </button>
              {previewFallback && <p className="mt-2 text-xs text-[color:var(--color-ink-400)]">{s.upload.preview_fallback}</p>}
              {previewUrl && <img src={previewUrl} alt="shadow preview" className="mt-3 rounded-xl border border-[color:var(--color-ink-200)]" />}
            </div>
          )}

          <div className="mb-5 flex items-center justify-between rounded-xl border border-[color:var(--color-ink-200)] p-3">
            <div>
              <div className="text-sm font-medium">{s.upload.stems_label}</div>
              <div className="text-xs text-[color:var(--color-ink-400)]">
                {stemsFallback ? s.upload.stems_fallback : s.upload.stems_desc}
              </div>
            </div>
            <button type="button" role="switch" aria-checked={supportStems}
              onClick={() => setSupportStems((p) => !p)}
              className={`relative h-6 w-11 rounded-full transition-colors ${supportStems ? 'bg-[color:var(--color-brand-500)]' : 'bg-[color:var(--color-ink-300)]'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${supportStems ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <FileUploadZone
            label={s.upload.floor_label}
            tooltip={s.upload.floor_tooltip}
            hint={s.upload.floor_hint}
            cta={s.upload.floor_cta}
            optional={s.upload.floor_optional}
            file={floorInsert}
            onFile={setFloorInsert}
            onError={setErrorMsg}
            errorMsgTooLarge={s.error.file_too_large}
            errorMsgInvalidType={s.error.file_invalid_type}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-xl bg-[color:var(--color-ink-50)] p-4 text-sm">
            <h2 className="mb-3 font-semibold">{s.review.title}</h2>
            <div className="space-y-1.5">
              {([
                [s.review.name, name],
                [s.review.contact, contact],
                notes ? [s.review.notes, notes] : null,
                [s.review.size, size],
                [s.review.shape, shape],
                (shape === 'rect' || shape === 'oval') ? [s.review.ratio, `${ratioW}:${ratioH}`] : null,
                [s.review.shadow, `Ø${shadowDiameter}cm, X${shadowOffsetX}mm, Y${shadowOffsetY}mm`],
                [s.review.stems, supportStems ? s.review.stems_yes : s.review.stems_no],
                [s.review.silhouette, silhouette?.name ?? '—'],
                [s.review.floor, floorInsert?.name ?? s.review.floor_none],
              ] as ([string, string] | null)[]).filter(Boolean).map(([label, val]) => (
                <div key={label} className="flex gap-2">
                  <span className="w-28 shrink-0 text-[color:var(--color-ink-400)]">{label}</span>
                  <span className="font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {errorMsg && <p role="alert" className="mt-3 text-sm text-red-600">{errorMsg}</p>}

      <div className={`mt-6 flex ${step > 1 ? 'justify-between' : 'justify-end'}`}>
        {step > 1 && (
          <button type="button" onClick={() => { setErrorMsg(''); setStep((p) => (p - 1) as Step) }}
            className="rounded-full border border-[color:var(--color-ink-200)] bg-white px-5 py-2.5 text-sm text-[color:var(--color-ink-500)] hover:border-[color:var(--color-ink-400)]">
            {s.back}
          </button>
        )}
        {step < 4 ? (
          <button type="button" onClick={handleNext}
            className="rounded-full bg-[color:var(--color-brand-500)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--color-brand-600)]">
            {s.next}
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={status === 'submitting'}
            className="rounded-full bg-[color:var(--color-brand-500)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--color-brand-600)] disabled:opacity-60">
            {status === 'submitting' ? s.submitting : s.submit}
          </button>
        )}
      </div>
    </div>
  )
}
