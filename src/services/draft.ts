import type { DraftMethod, DraftTurn, Player, TeamId } from '@/types'

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

/**
 * Minimum hero pool size for a given draft method. Defaults to `playerCount`
 * (one hero per player) when no method is supplied, matching the legacy
 * single-arg behaviour used by snake/random/all-pick flows.
 */
export const minimumPoolSize = (playerCount: number, method?: DraftMethod): number => {
  switch (method) {
    case 'random-draft':
      return playerCount + 2
    case 'single-draft':
      return playerCount * 3
    case 'pick-and-ban':
      return playerCount + 2 * heroesPerTeam(playerCount)
    case undefined:
    case 'snake':
    case 'random':
    case 'all-pick':
    default:
      return playerCount
  }
}

/**
 * Flip a fair coin to decide which team picks first. `rng()` < 0.5 → 'red',
 * otherwise 'blue'. Pure and deterministic given a stub rng.
 */
export const coinFlipTeam = (rng: () => number = Math.random): TeamId =>
  rng() < 0.5 ? 'red' : 'blue'

/** Sort players within a team: ascending seat, ties broken by id ascending. */
const sortBySeat = (players: Player[]): Player[] =>
  [...players].sort((x, y) => x.seat - y.seat || x.id.localeCompare(y.id))

/** Split players by team and assert balanced teams. */
const splitTeams = (players: Player[]): { red: Player[]; blue: Player[] } => {
  const red = players.filter((p) => p.team === 'red')
  const blue = players.filter((p) => p.team === 'blue')
  if (red.length !== blue.length) {
    throw new Error('teams must be equal size')
  }
  return { red: sortBySeat(red), blue: sortBySeat(blue) }
}

/**
 * One collective `pick` turn per player, alternating teams A,B,A,B,…
 * `playerId` is always null — any player on the active team may pick.
 */
export const buildAllPickTurns = (players: Player[], startTeam: TeamId): DraftTurn[] => {
  splitTeams(players) // validates equal teams
  const a: TeamId = startTeam
  const b: TeamId = startTeam === 'red' ? 'blue' : 'red'

  const turns: DraftTurn[] = []
  for (let i = 0; i < players.length; i++) {
    const team: TeamId = i % 2 === 0 ? a : b
    turns.push({ kind: 'pick', playerId: null, team })
  }
  return turns
}

/**
 * Collective snake draft turns. The team pattern is the standard snake
 * `A, B, B, A, A, B, B, A, …` where A = `startTeam`. Each turn is a `pick`
 * with `playerId: null` — any player on the active team may claim the pick.
 *
 * Throws if the two teams are not equal in size.
 */
export const buildSnakeTurns = (players: Player[], startTeam: TeamId): DraftTurn[] => {
  splitTeams(players) // validates equal teams
  const a: TeamId = startTeam
  const b: TeamId = startTeam === 'red' ? 'blue' : 'red'

  const turns: DraftTurn[] = []
  for (let i = 0; i < players.length; i++) {
    const slot = snakeTeamAt(i)
    const team: TeamId = slot === 'A' ? a : b
    turns.push({ kind: 'pick', playerId: null, team })
  }
  return turns
}

/**
 * Rulebook pick-and-ban sequence. Collective team turns (`playerId: null`).
 *
 * Let A = startTeam, B = the other team, H = heroesPerTeam(players.length).
 * Each round r ∈ [0, H) contributes 4 turns in this order:
 *   - ban(leader), ban(other), pick(leader), pick(other)
 * The leader alternates by round: r even → A, r odd → B.
 *
 * Concrete sequence (matches the GoA2 rulebook):
 *   1st Ban: A,B   1st Pick: A,B
 *   2nd Ban: B,A   2nd Pick: B,A
 *   3rd Ban: A,B   3rd Pick: A,B   ...
 *
 * Total turns = 4*H. Picks = 2*H = players.length. Bans = 2*H.
 */
export const buildPickBanTurns = (players: Player[], startTeam: TeamId): DraftTurn[] => {
  splitTeams(players) // validates equal teams
  const a: TeamId = startTeam
  const b: TeamId = startTeam === 'red' ? 'blue' : 'red'
  const h = heroesPerTeam(players.length)

  const turns: DraftTurn[] = []
  for (let r = 0; r < h; r++) {
    const leader: TeamId = r % 2 === 0 ? a : b
    const other: TeamId = leader === 'red' ? 'blue' : 'red'
    turns.push({ kind: 'ban', playerId: null, team: leader })
    turns.push({ kind: 'ban', playerId: null, team: other })
    turns.push({ kind: 'pick', playerId: null, team: leader })
    turns.push({ kind: 'pick', playerId: null, team: other })
  }
  return turns
}

/** Fisher-Yates shuffle of a copy of `arr` using `rng`. Pure. */
const shuffle = <T>(arr: T[], rng: () => number): T[] => {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/**
 * Randomly select `playerCount + 2` heroes from `heroPool` (no replacement).
 * Throws if the pool is too small.
 */
export const selectRandomDraftPool = (
  heroPool: string[],
  playerCount: number,
  rng: () => number = Math.random,
): string[] => {
  const needed = playerCount + 2
  if (heroPool.length < needed) {
    throw new Error('not enough heroes in pool')
  }
  return shuffle(heroPool, rng).slice(0, needed)
}

/**
 * Deal disjoint hands of `handSize` heroes to each player from a shuffled
 * pool. Throws if the pool is too small.
 */
export const dealHands = (
  playerIds: string[],
  heroPool: string[],
  handSize = 3,
  rng: () => number = Math.random,
): Record<string, string[]> => {
  if (heroPool.length < playerIds.length * handSize) {
    throw new Error('not enough heroes in pool')
  }
  const shuffled = shuffle(heroPool, rng)
  const hands: Record<string, string[]> = {}
  for (let i = 0; i < playerIds.length; i++) {
    hands[playerIds[i]] = shuffled.slice(i * handSize, (i + 1) * handSize)
  }
  return hands
}

/**
 * Look up the player id whose turn it is at `currentPick`, or null when the
 * index is out of range (draft complete or not yet started).
 */
export const nextPickerId = (draftOrder: string[], currentPick: number): string | null => {
  if (currentPick < 0 || currentPick >= draftOrder.length) return null
  return draftOrder[currentPick]
}
