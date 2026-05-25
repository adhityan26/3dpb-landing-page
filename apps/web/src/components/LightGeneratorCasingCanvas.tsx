import { useEffect, useRef } from 'react'
import type { LGShape } from '~/lib/light-generator-types'

interface Props {
  silhouetteObjectUrl: string | null
  shape: LGShape
  shapeRatio?: { width: number; height: number }
  shadowDiameter: number
  offsetX: number
  offsetY: number
}

const CANVAS_SIZE = 360
const PX_PER_CM = 10
const PX_PER_MM = 1
const STROKE_COLOR = '#4f46e5'
const STROKE_WIDTH = 2

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: LGShape,
  cx: number,
  cy: number,
  radius: number,
  ratio?: { width: number; height: number }
) {
  ctx.beginPath()
  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      break
    case 'square':
      ctx.rect(cx - radius, cy - radius, radius * 2, radius * 2)
      break
    case 'triangle': {
      const h = radius * Math.sqrt(3)
      ctx.moveTo(cx, cy - radius)
      ctx.lineTo(cx + h / 2, cy + radius / 2)
      ctx.lineTo(cx - h / 2, cy + radius / 2)
      ctx.closePath()
      break
    }
    case 'rect': {
      const maxDim = ratio ? Math.max(ratio.width, ratio.height) : 1
      const rw = ratio && maxDim > 0 ? radius * (ratio.width / maxDim) : radius
      const rh = ratio && maxDim > 0 ? radius * (ratio.height / maxDim) : radius
      ctx.rect(cx - rw, cy - rh, rw * 2, rh * 2)
      break
    }
    case 'oval': {
      const maxDim = ratio ? Math.max(ratio.width, ratio.height) : 1
      const ow = ratio && maxDim > 0 ? radius * (ratio.width / maxDim) : radius
      const oh = ratio && maxDim > 0 ? radius * (ratio.height / maxDim) : radius
      ctx.ellipse(cx, cy, ow, oh, 0, 0, Math.PI * 2)
      break
    }
  }
}

export default function LightGeneratorCasingCanvas({
  silhouetteObjectUrl,
  shape,
  shapeRatio,
  shadowDiameter,
  offsetX,
  offsetY,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const radius = (shadowDiameter * PX_PER_CM) / 2
    const cx = CANVAS_SIZE / 2 + offsetX * PX_PER_MM
    const cy = CANVAS_SIZE / 2 + offsetY * PX_PER_MM

    const render = (img?: HTMLImageElement) => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      if (img) {
        const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height)
        const w = img.width * scale
        const h = img.height * scale
        const x = (CANVAS_SIZE - w) / 2
        const y = (CANVAS_SIZE - h) / 2
        ctx.drawImage(img, x, y, w, h)
      }

      ctx.strokeStyle = STROKE_COLOR
      ctx.lineWidth = STROKE_WIDTH
      drawShape(ctx, shape, cx, cy, radius, shapeRatio)
      ctx.stroke()
    }

    if (silhouetteObjectUrl) {
      const img = new Image()
      img.onload = () => render(img)
      img.src = silhouetteObjectUrl
    } else {
      render()
    }
  }, [silhouetteObjectUrl, shape, shapeRatio, shadowDiameter, offsetX, offsetY])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="w-full rounded-xl border border-[color:var(--color-ink-200)] bg-[color:var(--color-ink-50)]"
      style={{ maxWidth: CANVAS_SIZE }}
    />
  )
}
