import { describe, it, expect } from 'vitest'
import {
  LG_SIZES,
  LG_SHAPES,
  isLGSize,
  isLGShape,
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
} from '~/lib/light-generator-types'

describe('light-generator-types', () => {
  it('exports valid size values', () => {
    expect(LG_SIZES).toEqual(['S', 'M', 'L'])
  })

  it('exports valid shape values', () => {
    expect(LG_SHAPES).toEqual(['circle', 'square', 'triangle', 'rect', 'oval'])
  })

  it('isLGSize accepts valid values', () => {
    expect(isLGSize('S')).toBe(true)
    expect(isLGSize('M')).toBe(true)
    expect(isLGSize('L')).toBe(true)
    expect(isLGSize('X')).toBe(false)
    expect(isLGSize('')).toBe(false)
  })

  it('isLGShape accepts valid values', () => {
    expect(isLGShape('circle')).toBe(true)
    expect(isLGShape('square')).toBe(true)
    expect(isLGShape('triangle')).toBe(true)
    expect(isLGShape('rect')).toBe(true)
    expect(isLGShape('oval')).toBe(true)
    expect(isLGShape('hexagon')).toBe(false)
  })

  it('MAX_FILE_BYTES is 5 MB', () => {
    expect(MAX_FILE_BYTES).toBe(5 * 1024 * 1024)
  })

  it('ALLOWED_MIME_TYPES includes image types', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/png')
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg')
    expect(ALLOWED_MIME_TYPES).toContain('image/webp')
  })
})
