export const LG_SIZES = ['S', 'M', 'L'] as const
export type LGSize = (typeof LG_SIZES)[number]

export const LG_SHAPES = ['circle', 'square', 'triangle', 'rect', 'oval'] as const
export type LGShape = (typeof LG_SHAPES)[number]

export function isLGSize(v: unknown): v is LGSize {
  return LG_SIZES.includes(v as LGSize)
}

export function isLGShape(v: unknown): v is LGShape {
  return LG_SHAPES.includes(v as LGShape)
}

export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const MAX_FILE_BYTES = 5 * 1024 * 1024

export interface LGShapeRatio {
  width: number
  height: number
}

export interface LGShadowConfig {
  diameter: number
  offsetX: number
  offsetY: number
}

export interface LGConfig {
  size: LGSize
  shape: LGShape
  shapeRatio?: LGShapeRatio
  shadow: LGShadowConfig
  supportStems: boolean
}
