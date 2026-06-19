#!/usr/bin/env node
/**
 * Build script: reads `scripts/heroes-source.csv` and generates
 * `src/data/heroes.ts`.
 *
 * Run with `npx tsx scripts/build-heroes.ts` (if tsx is available) or compile
 * via tsc. The committed `src/data/heroes.ts` is the source of truth — this
 * script exists for reproducibility. Re-run whenever the CSV changes.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Hero, HeroPackId, Role, StatValue, Stars } from '../src/types/index.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_PATH = resolve(__dirname, 'heroes-source.csv')
const OUT_PATH = resolve(__dirname, '..', 'src', 'data', 'heroes.ts')

const SET_TO_PACK_ID: Record<string, HeroPackId> = {
  Base: 'core',
  Defiant: 'defiant',
  Devoted: 'devoted',
  Renown: 'renowned',
  Arcane: 'arcane',
  Wayward: 'wayward',
}

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

/** Parse one CSV line, honouring double-quoted fields that contain commas. */
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (c === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function titleCaseRole(raw: string): Role {
  const t = raw.trim()
  const norm = t[0].toUpperCase() + t.slice(1).toLowerCase()
  if (!ALLOWED_ROLES.has(norm as Role)) {
    throw new Error(`Unknown role token: ${JSON.stringify(raw)}`)
  }
  return norm as Role
}

function parseStat(raw: string): StatValue {
  const t = raw.trim()
  const m = t.match(/^(\d+)(?:\s*\((\d+)\))?$/)
  if (!m) {
    throw new Error(`Cannot parse stat: ${JSON.stringify(raw)}`)
  }
  const base = Number(m[1])
  if (m[2] !== undefined) {
    return { base, upgraded: Number(m[2]) }
  }
  return { base }
}

function uniqueInOrder<T>(arr: T[]): T[] {
  const seen = new Set<T>()
  const out: T[] = []
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x)
      out.push(x)
    }
  }
  return out
}

function buildHero(fields: string[]): Hero {
  const [
    name,
    starsRaw,
    setName,
    role1Raw,
    role2Raw,
    additionalRaw,
    attackRaw,
    initRaw,
    defRaw,
    moveRaw,
    totalRaw,
  ] = fields

  const starsNum = Number(starsRaw)
  if (starsNum !== 1 && starsNum !== 2 && starsNum !== 3 && starsNum !== 4) {
    throw new Error(`Invalid stars value for ${name}: ${starsRaw}`)
  }
  const stars = starsNum as Stars

  const pack = SET_TO_PACK_ID[setName]
  if (!pack) {
    throw new Error(`Unknown set for ${name}: ${setName}`)
  }

  const role1 = titleCaseRole(role1Raw)
  const role2 = titleCaseRole(role2Raw)

  const additional: Role[] =
    additionalRaw === '-' || additionalRaw === ''
      ? []
      : additionalRaw.split(',').map((r) => titleCaseRole(r))

  const primaryRoles: Role[] = [role1, role2]
  const roles = uniqueInOrder<Role>([...primaryRoles, ...additional])

  const id = slugify(name)

  return {
    id,
    name,
    stars,
    pack,
    roles,
    primaryRoles,
    stats: {
      attack: parseStat(attackRaw),
      initiative: parseStat(initRaw),
      defense: parseStat(defRaw),
      movement: parseStat(moveRaw),
      total: parseStat(totalRaw),
    },
    imageId: id,
  }
}

function statLiteral(s: StatValue): string {
  if (s.upgraded === undefined) return `{ base: ${s.base} }`
  return `{ base: ${s.base}, upgraded: ${s.upgraded} }`
}

function heroLiteral(h: Hero): string {
  const roles = h.roles.map((r) => `'${r}'`).join(', ')
  const primary = h.primaryRoles.map((r) => `'${r}'`).join(', ')
  return `  {
    id: '${h.id}',
    name: ${JSON.stringify(h.name)},
    stars: ${h.stars},
    pack: '${h.pack}',
    roles: [${roles}],
    primaryRoles: [${primary}],
    stats: {
      attack: ${statLiteral(h.stats.attack)},
      initiative: ${statLiteral(h.stats.initiative)},
      defense: ${statLiteral(h.stats.defense)},
      movement: ${statLiteral(h.stats.movement)},
      total: ${statLiteral(h.stats.total)},
    },
    imageId: '${h.imageId}',
  }`
}

function main(): void {
  const csv = readFileSync(CSV_PATH, 'utf8')
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0)
  const rows = lines.slice(1).map(parseCsvLine)

  const heroes = rows.map(buildHero)

  // Sanity: unique ids.
  const ids = new Set<string>()
  for (const h of heroes) {
    if (ids.has(h.id)) throw new Error(`Duplicate id: ${h.id}`)
    ids.add(h.id)
  }

  const body = `/**
 * Auto-generated by \`scripts/build-heroes.ts\` from \`scripts/heroes-source.csv\`.
 * Do not edit by hand — re-run the script if the CSV changes.
 */
import type { Hero } from '@/types'

export const HEROES: Hero[] = [
${heroes.map(heroLiteral).join(',\n')},
]

const HEROES_BY_ID: ReadonlyMap<string, Hero> = new Map(HEROES.map((h) => [h.id, h]))

export function getHeroById(id: string): Hero | undefined {
  return HEROES_BY_ID.get(id)
}
`

  writeFileSync(OUT_PATH, body, 'utf8')
  console.log(`Wrote ${OUT_PATH} with ${heroes.length} heroes.`)
}

main()
