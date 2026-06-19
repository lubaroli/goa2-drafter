import { describe, it, expect } from 'vitest'
import type { HeroPackId } from '@/types'
import { HERO_PACKS, getPackById } from './packs'
import { getHeroById } from './heroes'

describe('HERO_PACKS', () => {
  it('has exactly 6 packs', () => {
    expect(HERO_PACKS).toHaveLength(6)
  })

  it('has the expected pack ids', () => {
    const ids = HERO_PACKS.map((p) => p.id).sort()
    expect(ids).toEqual(['arcane', 'core', 'defiant', 'devoted', 'renowned', 'wayward'])
  })

  it('core pack has 7 heroes; the other 5 packs have 5 each', () => {
    const core = HERO_PACKS.find((p) => p.id === 'core')
    expect(core?.heroIds).toHaveLength(7)

    for (const pack of HERO_PACKS) {
      if (pack.id === 'core') continue
      expect(pack.heroIds).toHaveLength(5)
    }
  })

  it('total heroIds across all packs equals 32', () => {
    const total = HERO_PACKS.reduce((sum, p) => sum + p.heroIds.length, 0)
    expect(total).toBe(32)
  })

  it('every heroId in every pack resolves via getHeroById', () => {
    for (const pack of HERO_PACKS) {
      for (const heroId of pack.heroIds) {
        expect(getHeroById(heroId), `hero ${heroId} in pack ${pack.id}`).toBeDefined()
      }
    }
  })

  it('uses the expected human-readable pack names', () => {
    const byId = new Map(HERO_PACKS.map((p) => [p.id, p.name]))
    expect(byId.get('core')).toBe('Core Set')
    expect(byId.get('defiant')).toBe('Defiant Hero Pack')
    expect(byId.get('devoted')).toBe('Devoted Hero Pack')
    expect(byId.get('renowned')).toBe('Renowned Hero Pack')
    expect(byId.get('arcane')).toBe('Arcane Hero Pack')
    expect(byId.get('wayward')).toBe('Wayward Hero Pack')
  })

  it('getPackById returns the right pack', () => {
    const pack = getPackById('core')
    expect(pack?.name).toBe('Core Set')
  })

  it('getPackById returns undefined for an unknown id', () => {
    // Cast: HeroPackId is a closed union; this simulates a runtime miss.
    expect(getPackById('nope' as HeroPackId)).toBeUndefined()
  })
})
