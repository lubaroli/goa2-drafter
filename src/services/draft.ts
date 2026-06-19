import type { Player, TeamId } from '@/types'

/**
 * Determine which team picks first ("A"). It's the team of the player with the
 * lowest seat. Tie-break: 'red' before 'blue'.
 */
const firstTeam = (players: Player[]): TeamId => {
  let minSeat = Infinity
  let minRed = false
  let minBlue = false
  for (const p of players) {
    if (p.seat < minSeat) {
      minSeat = p.seat
      minRed = p.team === 'red'
      minBlue = p.team === 'blue'
    } else if (p.seat === minSeat) {
      if (p.team === 'red') minRed = true
      else minBlue = true
    }
  }
  if (minRed) return 'red'
  if (minBlue) return 'blue'
  // Should be unreachable when players is non-empty.
  return 'red'
}

/**
 * Snake team sequence: A, B, B, A, A, B, B, A, ...
 * Index 0 is A; subsequent picks come in same-team pairs that alternate.
 */
const snakeTeamAt = (i: number): 'A' | 'B' => {
  if (i === 0) return 'A'
  // Pairs (1,2),(3,4),(5,6),... — even-indexed pairs (0,2,4,...) are B; odd pairs (1,3,5,...) are A.
  const pairIndex = Math.floor((i - 1) / 2)
  return pairIndex % 2 === 0 ? 'B' : 'A'
}

/**
 * Build the ordered list of player ids for a snake draft.
 *
 * Throws if the two teams are not equal in size.
 */
export const buildSnakeDraftOrder = (players: Player[]): string[] => {
  const red = players.filter((p) => p.team === 'red')
  const blue = players.filter((p) => p.team === 'blue')
  if (red.length !== blue.length) {
    throw new Error('teams must be equal size')
  }

  const a = firstTeam(players)
  const b: TeamId = a === 'red' ? 'blue' : 'red'

  // Stable seat ordering — ties broken by id for determinism.
  const byTeam: Record<TeamId, Player[]> = {
    red: [...red].sort((x, y) => x.seat - y.seat || x.id.localeCompare(y.id)),
    blue: [...blue].sort((x, y) => x.seat - y.seat || x.id.localeCompare(y.id)),
  }

  const cursor: Record<TeamId, number> = { red: 0, blue: 0 }
  const total = players.length
  const order: string[] = []
  for (let i = 0; i < total; i++) {
    const slot = snakeTeamAt(i)
    const team = slot === 'A' ? a : b
    const player = byTeam[team][cursor[team]++]
    order.push(player.id)
  }
  return order
}

/**
 * Randomly assign exactly one hero per player from the pool.
 * Uses a Fisher-Yates shuffle seeded by `rng` (defaults to Math.random).
 */
export const randomAssignment = (
  playerIds: string[],
  heroPool: string[],
  rng: () => number = Math.random,
): Record<string, string> => {
  if (heroPool.length < playerIds.length) {
    throw new Error('not enough heroes in pool')
  }
  const pool = [...heroPool]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = pool[i]
    pool[i] = pool[j]
    pool[j] = tmp
  }
  const result: Record<string, string> = {}
  for (let i = 0; i < playerIds.length; i++) {
    result[playerIds[i]] = pool[i]
  }
  return result
}

/** Heroes a single team needs — playerCount / 2. Throws on odd counts. */
export const heroesPerTeam = (playerCount: number): number => {
  if (playerCount % 2 !== 0) {
    throw new Error('player count must be even')
  }
  return playerCount / 2
}

/** Minimum hero pool size — one hero per player. */
export const minimumPoolSize = (playerCount: number): number => playerCount

/**
 * Look up the player id whose turn it is at `currentPick`, or null when the
 * index is out of range (draft complete or not yet started).
 */
export const nextPickerId = (draftOrder: string[], currentPick: number): string | null => {
  if (currentPick < 0 || currentPick >= draftOrder.length) return null
  return draftOrder[currentPick]
}
