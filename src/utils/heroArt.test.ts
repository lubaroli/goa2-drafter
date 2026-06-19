import { describe, expect, it } from 'vitest'
import { heroImageUrl, heroMonogram, heroPlaceholderStyle } from './heroArt'

describe('heroImageUrl', () => {
  it('contains the imageId and the .png suffix', () => {
    const url = heroImageUrl('arien-the-tidemaster')
    expect(url).toContain('arien-the-tidemaster')
    expect(url).toMatch(/\.png$/)
  })

  it('places the heroes path segment before the file name', () => {
    expect(heroImageUrl('brogan-the-destroyer')).toContain('heroes/brogan-the-destroyer.png')
  })
})

describe('heroPlaceholderStyle', () => {
  it('is deterministic — the same id yields the same background', () => {
    const a = heroPlaceholderStyle('arien-the-tidemaster')
    const b = heroPlaceholderStyle('arien-the-tidemaster')
    expect(a.background).toBe(b.background)
  })

  it('produces different backgrounds for different ids', () => {
    const a = heroPlaceholderStyle('arien-the-tidemaster')
    const b = heroPlaceholderStyle('brogan-the-destroyer')
    expect(a.background).not.toBe(b.background)
  })

  it('returns a CSS linear-gradient string', () => {
    const { background } = heroPlaceholderStyle('arien-the-tidemaster')
    expect(background).toMatch(/^linear-gradient\(/)
  })
})

describe('heroMonogram', () => {
  it('returns the uppercase first letter of the first word', () => {
    expect(heroMonogram('Arien the Tidemaster')).toBe('A')
    expect(heroMonogram('brogan the destroyer')).toBe('B')
  })

  it('returns an empty string for empty input', () => {
    expect(heroMonogram('')).toBe('')
    expect(heroMonogram('   ')).toBe('')
  })
})
