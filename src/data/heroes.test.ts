import { describe, it, expect } from 'vitest'
import type { Role } from '@/types'
import { HEROES, getHeroById } from './heroes'

const ALLOWED_ROLES: ReadonlySet<Role> = new Set<Role>([
  'Tactician',
  'Disabler',
  'Durable',
  'Pusher',
  'Melee',
  'Farming',
  'Damager',
  'Sniper',
  'Healer',
  'Tokens',
])

describe('HEROES', () => {
  it('has exactly 32 entries', () => {
    expect(HEROES).toHaveLength(32)
  })

  it('has unique ids across all heroes', () => {
    const ids = HEROES.map((h) => h.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('parses an upgraded stat into { base, upgraded } (Arien defense 5 (6))', () => {
    const arien = HEROES.find((h) => h.id === 'arien-the-tidemaster')
    expect(arien).toBeDefined()
    expect(arien?.stats.defense).toEqual({ base: 5, upgraded: 6 })
  })

  it('parses Sabina attack 1 (8) into { base: 1, upgraded: 8 }', () => {
    const sabina = HEROES.find((h) => h.id === 'sabina-the-gunslinger')
    expect(sabina).toBeDefined()
    expect(sabina?.stats.attack).toEqual({ base: 1, upgraded: 8 })
  })

  it('parses a plain stat into { base } with no upgraded (Sabina initiative 5)', () => {
    const sabina = HEROES.find((h) => h.id === 'sabina-the-gunslinger')
    expect(sabina?.stats.initiative).toEqual({ base: 5 })
    expect(sabina?.stats.initiative.upgraded).toBeUndefined()
  })

  it('normalizes every hero role to the Role union (no lowercase leakage)', () => {
    for (const hero of HEROES) {
      for (const role of hero.roles) {
        expect(ALLOWED_ROLES.has(role)).toBe(true)
      }
      for (const role of hero.primaryRoles) {
        expect(ALLOWED_ROLES.has(role)).toBe(true)
      }
    }
  })

  it('title-cases lowercase CSV roles (Mrak has Tactician, Mortimer has Farming)', () => {
    const mrak = HEROES.find((h) => h.id === 'mrak-the-rockshaper')
    expect(mrak).toBeDefined()
    expect(mrak?.roles).toContain('Tactician')

    const mortimer = HEROES.find((h) => h.id === 'mortimer-the-awakener')
    expect(mortimer).toBeDefined()
    expect(mortimer?.roles).toContain('Farming')
  })

  it('puts primary roles first in the unique union', () => {
    const arien = HEROES.find((h) => h.id === 'arien-the-tidemaster')
    expect(arien?.primaryRoles).toEqual(['Tactician', 'Disabler'])
    expect(arien?.roles.slice(0, 2)).toEqual(['Tactician', 'Disabler'])
  })

  it('getHeroById returns the right hero', () => {
    const hero = getHeroById('arien-the-tidemaster')
    expect(hero?.name).toBe('Arien the Tidemaster')
  })

  it('getHeroById returns undefined for junk', () => {
    expect(getHeroById('not-a-real-hero')).toBeUndefined()
  })

  it('every hero.pack is a valid HeroPackId', () => {
    const allowed = new Set(['core', 'defiant', 'devoted', 'renowned', 'arcane', 'wayward'])
    for (const hero of HEROES) {
      expect(allowed.has(hero.pack)).toBe(true)
    }
  })

  it('imageId equals id for every hero', () => {
    for (const hero of HEROES) {
      expect(hero.imageId).toBe(hero.id)
    }
  })

  it('slugs hero names correctly (Widget and Pyro → widget-and-pyro)', () => {
    expect(getHeroById('widget-and-pyro')).toBeDefined()
    expect(getHeroById('cutter-the-sky-pirate')).toBeDefined()
  })
})
