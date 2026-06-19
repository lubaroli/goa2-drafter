import type { HeroPack, HeroPackId } from '@/types'
import { HEROES } from './heroes'

const PACK_ORDER: readonly HeroPackId[] = [
  'core',
  'defiant',
  'devoted',
  'renowned',
  'arcane',
  'wayward',
] as const

const PACK_NAMES: Record<HeroPackId, string> = {
  core: 'Core Set',
  defiant: 'Defiant Hero Pack',
  devoted: 'Devoted Hero Pack',
  renowned: 'Renowned Hero Pack',
  arcane: 'Arcane Hero Pack',
  wayward: 'Wayward Hero Pack',
}

export const HERO_PACKS: HeroPack[] = PACK_ORDER.map((id) => ({
  id,
  name: PACK_NAMES[id],
  heroIds: HEROES.filter((h) => h.pack === id).map((h) => h.id),
}))

const PACKS_BY_ID: ReadonlyMap<HeroPackId, HeroPack> = new Map(HERO_PACKS.map((p) => [p.id, p]))

export function getPackById(id: HeroPackId): HeroPack | undefined {
  return PACKS_BY_ID.get(id)
}
