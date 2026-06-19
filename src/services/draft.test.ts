import type { Player, TeamId } from '@/types'
import {
  buildSnakeDraftOrder,
  heroesPerTeam,
  minimumPoolSize,
  nextPickerId,
  randomAssignment,
} from './draft'

interface MakePlayerInput {
  id: string
  team: TeamId
  seat: number
  name?: string
}

const makePlayer = ({ id, team, seat, name }: MakePlayerInput): Player => ({
  id,
  name: name ?? id,
  team,
  token: `tok-${id}`,
  seat,
})

const teamsOf = (order: string[], players: Player[]): TeamId[] => {
  const byId = new Map(players.map((p) => [p.id, p]))
  return order.map((id) => {
    const p = byId.get(id)
    if (!p) throw new Error(`unknown id: ${id}`)
    return p.team
  })
}

describe('buildSnakeDraftOrder', () => {
  it('produces the A,B,B,A,A,B team pattern for 6 players (red has lowest seat)', () => {
    const players: Player[] = [
      makePlayer({ id: 'r0', team: 'red', seat: 0 }),
      makePlayer({ id: 'b1', team: 'blue', seat: 1 }),
      makePlayer({ id: 'r2', team: 'red', seat: 2 }),
      makePlayer({ id: 'b3', team: 'blue', seat: 3 }),
      makePlayer({ id: 'r4', team: 'red', seat: 4 }),
      makePlayer({ id: 'b5', team: 'blue', seat: 5 }),
    ]

    const order = buildSnakeDraftOrder(players)

    expect(order).toHaveLength(6)
    expect(teamsOf(order, players)).toEqual(['red', 'blue', 'blue', 'red', 'red', 'blue'])
  })

  it('contains every player id exactly once', () => {
    const players: Player[] = [
      makePlayer({ id: 'r0', team: 'red', seat: 0 }),
      makePlayer({ id: 'b1', team: 'blue', seat: 1 }),
      makePlayer({ id: 'r2', team: 'red', seat: 2 }),
      makePlayer({ id: 'b3', team: 'blue', seat: 3 }),
      makePlayer({ id: 'r4', team: 'red', seat: 4 }),
      makePlayer({ id: 'b5', team: 'blue', seat: 5 }),
    ]

    const order = buildSnakeDraftOrder(players)

    expect([...order].sort()).toEqual(['b1', 'b3', 'b5', 'r0', 'r2', 'r4'])
  })

  it('respects seat order within each team (lowest seat picks first for that team)', () => {
    const players: Player[] = [
      makePlayer({ id: 'r-late', team: 'red', seat: 4 }),
      makePlayer({ id: 'b-mid', team: 'blue', seat: 3 }),
      makePlayer({ id: 'r-early', team: 'red', seat: 0 }),
      makePlayer({ id: 'b-late', team: 'blue', seat: 5 }),
      makePlayer({ id: 'r-mid', team: 'red', seat: 2 }),
      makePlayer({ id: 'b-early', team: 'blue', seat: 1 }),
    ]

    const order = buildSnakeDraftOrder(players)

    // Red picks at indices 0, 3, 4 (A,B,B,A,A,B). Order within red by seat: r-early, r-mid, r-late.
    expect(order[0]).toBe('r-early')
    expect(order[3]).toBe('r-mid')
    expect(order[4]).toBe('r-late')
    // Blue picks at indices 1, 2, 5. Order within blue by seat: b-early, b-mid, b-late.
    expect(order[1]).toBe('b-early')
    expect(order[2]).toBe('b-mid')
    expect(order[5]).toBe('b-late')
  })

  it('produces the A,B,B,A pattern for 4 players (red has lowest seat)', () => {
    const players: Player[] = [
      makePlayer({ id: 'r0', team: 'red', seat: 0 }),
      makePlayer({ id: 'b1', team: 'blue', seat: 1 }),
      makePlayer({ id: 'r2', team: 'red', seat: 2 }),
      makePlayer({ id: 'b3', team: 'blue', seat: 3 }),
    ]

    const order = buildSnakeDraftOrder(players)

    expect(teamsOf(order, players)).toEqual(['red', 'blue', 'blue', 'red'])
  })

  it('makes blue team A when blue has the lowest seat', () => {
    const players: Player[] = [
      makePlayer({ id: 'b0', team: 'blue', seat: 0 }),
      makePlayer({ id: 'r1', team: 'red', seat: 1 }),
      makePlayer({ id: 'b2', team: 'blue', seat: 2 }),
      makePlayer({ id: 'r3', team: 'red', seat: 3 }),
    ]

    const order = buildSnakeDraftOrder(players)

    expect(teamsOf(order, players)).toEqual(['blue', 'red', 'red', 'blue'])
  })

  it('breaks ties by making red team A when both teams could be first', () => {
    // Both teams have a player at seat 0 (contrived for tie-break check).
    const players: Player[] = [
      makePlayer({ id: 'r0', team: 'red', seat: 0 }),
      makePlayer({ id: 'b0', team: 'blue', seat: 0 }),
      makePlayer({ id: 'r1', team: 'red', seat: 1 }),
      makePlayer({ id: 'b1', team: 'blue', seat: 1 }),
    ]

    const order = buildSnakeDraftOrder(players)

    expect(teamsOf(order, players)).toEqual(['red', 'blue', 'blue', 'red'])
  })

  it('throws when teams are not equal size', () => {
    const players: Player[] = [
      makePlayer({ id: 'r0', team: 'red', seat: 0 }),
      makePlayer({ id: 'r1', team: 'red', seat: 1 }),
      makePlayer({ id: 'b2', team: 'blue', seat: 2 }),
    ]

    expect(() => buildSnakeDraftOrder(players)).toThrow('teams must be equal size')
  })

  it('throws when an even count produces unequal teams', () => {
    const players: Player[] = [
      makePlayer({ id: 'r0', team: 'red', seat: 0 }),
      makePlayer({ id: 'r1', team: 'red', seat: 1 }),
      makePlayer({ id: 'r2', team: 'red', seat: 2 }),
      makePlayer({ id: 'b3', team: 'blue', seat: 3 }),
    ]

    expect(() => buildSnakeDraftOrder(players)).toThrow('teams must be equal size')
  })
})

describe('randomAssignment', () => {
  it('assigns exactly one distinct hero per player', () => {
    const playerIds = ['p1', 'p2', 'p3', 'p4']
    const heroPool = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

    const result = randomAssignment(playerIds, heroPool, () => 0)

    expect(Object.keys(result).sort()).toEqual([...playerIds].sort())
    const assigned = playerIds.map((id) => result[id])
    expect(new Set(assigned).size).toBe(playerIds.length)
    for (const heroId of assigned) {
      expect(heroPool).toContain(heroId)
    }
  })

  it('is deterministic given a stubbed rng', () => {
    const playerIds = ['p1', 'p2', 'p3']
    const heroPool = ['h1', 'h2', 'h3', 'h4', 'h5']

    const a = randomAssignment(playerIds, heroPool, () => 0)
    const b = randomAssignment(playerIds, heroPool, () => 0)

    expect(a).toEqual(b)
  })

  it('produces different results for different rngs', () => {
    const playerIds = ['p1', 'p2', 'p3']
    const heroPool = ['h1', 'h2', 'h3', 'h4', 'h5']

    const zero = randomAssignment(playerIds, heroPool, () => 0)
    // 0.999... will pick the last index in Fisher-Yates each step.
    const high = randomAssignment(playerIds, heroPool, () => 0.999999)

    expect(zero).not.toEqual(high)
  })

  it('throws when the hero pool is too small', () => {
    expect(() => randomAssignment(['p1', 'p2', 'p3'], ['h1', 'h2'])).toThrow(
      'not enough heroes in pool',
    )
  })

  it('works when pool size equals player count', () => {
    const playerIds = ['p1', 'p2']
    const heroPool = ['h1', 'h2']

    const result = randomAssignment(playerIds, heroPool, () => 0)

    expect(Object.keys(result).sort()).toEqual(['p1', 'p2'])
    expect(new Set(Object.values(result)).size).toBe(2)
  })
})

describe('heroesPerTeam', () => {
  it('returns playerCount / 2 for even counts', () => {
    expect(heroesPerTeam(4)).toBe(2)
    expect(heroesPerTeam(6)).toBe(3)
    expect(heroesPerTeam(8)).toBe(4)
    expect(heroesPerTeam(10)).toBe(5)
  })

  it('throws on odd player counts', () => {
    expect(() => heroesPerTeam(5)).toThrow('player count must be even')
    expect(() => heroesPerTeam(7)).toThrow('player count must be even')
  })
})

describe('minimumPoolSize', () => {
  it('equals the player count', () => {
    expect(minimumPoolSize(4)).toBe(4)
    expect(minimumPoolSize(6)).toBe(6)
    expect(minimumPoolSize(10)).toBe(10)
  })
})

describe('nextPickerId', () => {
  it('returns the player id at the current pick', () => {
    const order = ['p1', 'p2', 'p3', 'p4']

    expect(nextPickerId(order, 0)).toBe('p1')
    expect(nextPickerId(order, 2)).toBe('p3')
    expect(nextPickerId(order, 3)).toBe('p4')
  })

  it('returns null when the draft is complete or out of range', () => {
    const order = ['p1', 'p2', 'p3']

    expect(nextPickerId(order, 3)).toBeNull()
    expect(nextPickerId(order, 99)).toBeNull()
    expect(nextPickerId(order, -1)).toBeNull()
  })

  it('returns null for an empty order', () => {
    expect(nextPickerId([], 0)).toBeNull()
  })
})
