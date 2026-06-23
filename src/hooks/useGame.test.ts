import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { LocalGameStore } from '@/services/store/LocalGameStore'
import { HEROES } from '@/data/heroes'
import type {
  CreateGameInput,
  Game,
  GameSnapshot,
  GameStore,
  PickResult,
  Player,
  TeamId,
} from '@/types'
import { useGame } from './useGame'

interface CreatedGame {
  game: Game
  organiserToken: string
  players: Player[]
}

const heroPool = (): string[] => HEROES.slice(0, 12).map((h) => h.id)

const fourPlayerInput = (): CreateGameInput => ({
  playerCount: 4,
  method: 'snake',
  heroPool: heroPool(),
  players: [
    { name: 'Alice', team: 'red', seat: 1 },
    { name: 'Bob', team: 'blue', seat: 2 },
    { name: 'Carol', team: 'red', seat: 3 },
    { name: 'Dave', team: 'blue', seat: 4 },
  ],
})

const allPickInput = (): CreateGameInput => ({
  ...fourPlayerInput(),
  method: 'all-pick',
})

const pickBanInput = (): CreateGameInput => ({
  ...fourPlayerInput(),
  method: 'pick-and-ban',
})

const singleDraftInput = (): CreateGameInput => ({
  ...fourPlayerInput(),
  method: 'single-draft',
})

/**
 * Find the next acting player for a COLLECTIVE turn-based draft (snake,
 * all-pick, random-draft): the team is determined by `turns[currentPick].team`;
 * the actor is any teammate who hasn't taken a pick yet. We pick the
 * lowest-seat unpicked teammate for determinism, mirroring the rule the store
 * applies to claim ownership.
 */
const nextActorForCollectiveTurn = (
  game: Game,
  players: Player[],
  pickedPlayerIds: ReadonlySet<string>,
): Player => {
  const turn = game.turns[game.currentPick]
  if (!turn) throw new Error('no current turn')
  const team: TeamId = turn.team
  const eligible = players
    .filter((p) => p.team === team && !pickedPlayerIds.has(p.id))
    .sort((a, b) => a.seat - b.seat || a.id.localeCompare(b.id))
  if (eligible.length === 0) throw new Error('no eligible teammate for active turn')
  return eligible[0]
}

const pickAvailable = (created: CreatedGame, usedHeroIds: Set<string>): string => {
  const next = created.game.heroPool.find((id) => !usedHeroIds.has(id))
  if (!next) throw new Error('no heroes left in pool')
  return next
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('useGame', () => {
  it('loads the snapshot and exposes the first team on the clock (snake is collective)', async () => {
    const store = new LocalGameStore()
    const created = await store.createGame(fourPlayerInput())

    const { result } = renderHook(() => useGame(created.game.id, store))

    expect(result.current.loading).toBe(true)
    expect(result.current.snapshot).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.snapshot).not.toBeNull()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.snapshot?.game.id).toBe(created.game.id)
    // Snake is now COLLECTIVE: turns carry a team, not a player id.
    // currentPickerId is null; the active team comes from currentTurn.team.
    expect(result.current.currentPickerId).toBeNull()
    const firstTurn = result.current.currentTurn
    expect(firstTurn).not.toBeNull()
    expect(firstTurn?.kind).toBe('pick')
    expect(firstTurn?.playerId).toBeNull()
    expect(firstTurn?.team).toBe(created.game.turns[0].team)
    expect(result.current.isComplete).toBe(false)
  })

  it('makePick by a wrong-team player returns ok:false and snapshot is unchanged', async () => {
    const store = new LocalGameStore()
    const created = await store.createGame(fourPlayerInput())

    const { result } = renderHook(() => useGame(created.game.id, store))
    await waitFor(() => expect(result.current.snapshot).not.toBeNull())

    // Snake is collective: turns are owned by a team. Pick a player on the
    // OTHER team than the active one to deterministically trigger 'not-your-team'.
    const activeTeam = created.game.turns[0].team
    const wrongTeam: TeamId = activeTeam === 'red' ? 'blue' : 'red'
    const wrongPlayer = created.players.find((p) => p.team === wrongTeam)
    if (!wrongPlayer) throw new Error('expected a player on the other team')
    const heroId = created.game.heroPool[0]

    let res: PickResult | undefined
    await act(async () => {
      res = await result.current.makePick(wrongPlayer.token, heroId)
    })

    expect(res).toEqual({ ok: false, error: 'not-your-team' })
    // currentPickerId stays null (collective turn), turn is unchanged.
    expect(result.current.currentPickerId).toBeNull()
    expect(result.current.currentTurn?.team).toBe(activeTeam)
    expect(result.current.snapshot?.picks).toHaveLength(0)
  })

  it('makePick by an active-team player advances the snapshot (collective snake)', async () => {
    const store = new LocalGameStore()
    const created = await store.createGame(fourPlayerInput())

    const { result } = renderHook(() => useGame(created.game.id, store))
    await waitFor(() => expect(result.current.snapshot).not.toBeNull())

    // Pick any teammate on the active team — collective turn.
    const actor = nextActorForCollectiveTurn(created.game, created.players, new Set())
    const heroId = created.game.heroPool[0]

    let res: PickResult | undefined
    await act(async () => {
      res = await result.current.makePick(actor.token, heroId)
    })

    expect(res?.ok).toBe(true)
    await waitFor(() => {
      expect(result.current.snapshot?.picks).toHaveLength(1)
    })
    // The next turn (also collective) belongs to a team; currentPickerId is null.
    expect(result.current.currentPickerId).toBeNull()
    expect(result.current.snapshot?.game.currentPick).toBe(1)
    expect(result.current.currentTurn?.team).toBe(result.current.snapshot?.game.turns[1].team)
    // The acting player owns the hero.
    expect(result.current.snapshot?.picks[0].playerId).toBe(actor.id)
  })

  it('subscribes to the same store: external picks update the hook snapshot', async () => {
    const store = new LocalGameStore()
    const created = await store.createGame(fourPlayerInput())

    const { result } = renderHook(() => useGame(created.game.id, store))
    await waitFor(() => expect(result.current.snapshot).not.toBeNull())

    const actor = nextActorForCollectiveTurn(created.game, created.players, new Set())
    const heroId = created.game.heroPool[0]

    await act(async () => {
      await store.makePick(created.game.id, actor.token, heroId)
    })

    await waitFor(() => {
      expect(result.current.snapshot?.picks).toHaveLength(1)
      expect(result.current.snapshot?.game.currentPick).toBe(1)
    })
    // Collective: no per-player picker id.
    expect(result.current.currentPickerId).toBeNull()
  })

  it('returns an error for an unknown gameId', async () => {
    const store = new LocalGameStore()
    const { result } = renderHook(() => useGame('NOPE-NOT-REAL', store))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.snapshot).toBeNull()
    expect(result.current.error).toMatch(/not found/i)
  })

  it('does nothing when gameId is undefined', async () => {
    const store = new LocalGameStore()
    const { result } = renderHook(() => useGame(undefined, store))

    expect(result.current.snapshot).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.currentPickerId).toBeNull()
    expect(result.current.isComplete).toBe(false)

    // makePick with no gameId resolves with a not-found result.
    let res: PickResult | undefined
    await act(async () => {
      res = await result.current.makePick('any', 'any')
    })
    expect(res).toEqual({ ok: false, error: 'game-not-found' })
  })

  it('flips isComplete=true after a full snake playthrough', async () => {
    const store = new LocalGameStore()
    const created = await store.createGame(fourPlayerInput())

    const { result } = renderHook(() => useGame(created.game.id, store))
    await waitFor(() => expect(result.current.snapshot).not.toBeNull())

    const used = new Set<string>()
    const pickedPlayerIds = new Set<string>()
    const totalPicks = created.game.turns.filter((t) => t.kind === 'pick').length
    for (let i = 0; i < totalPicks; i++) {
      // Read the live game so currentPick is fresh after each pick.
      const liveGame = result.current.snapshot?.game
      if (!liveGame) throw new Error('expected a live game')
      const actor = nextActorForCollectiveTurn(liveGame, created.players, pickedPlayerIds)
      const heroId = pickAvailable(created, used)
      used.add(heroId)
      pickedPlayerIds.add(actor.id)
      let res: PickResult | undefined
      await act(async () => {
        res = await result.current.makePick(actor.token, heroId)
      })
      expect(res?.ok).toBe(true)
    }

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true)
    })
    expect(result.current.currentPickerId).toBeNull()
    expect(result.current.snapshot?.picks).toHaveLength(totalPicks)
  })

  it('refresh re-fetches the snapshot independently of subscription', async () => {
    // Use a stub store with a NO-OP subscribe so the only path that can
    // update state is `refresh()`. `getSnapshot` returns A first, then B on
    // every subsequent call. Without refresh(), the hook would stay on A.
    const created = await new LocalGameStore().createGame(fourPlayerInput())
    const snapA: GameSnapshot = {
      game: { ...created.game },
      players: created.players.map((p) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        seat: p.seat,
      })),
      picks: [],
    }
    const snapB: GameSnapshot = {
      ...snapA,
      game: { ...snapA.game, currentPick: 1 },
      picks: [
        {
          id: 'pick-b',
          playerId: created.players[0].id,
          heroId: created.game.heroPool[0],
          pickIndex: 0,
          createdAt: 1,
        },
      ],
    }

    let getCalls = 0
    const stub: GameStore = {
      createGame: () => Promise.reject(new Error('not implemented')),
      getSnapshot: (): Promise<GameSnapshot | null> => {
        getCalls += 1
        return Promise.resolve(getCalls === 1 ? snapA : snapB)
      },
      makePick: (): Promise<PickResult> =>
        Promise.resolve({ ok: false, error: 'game-not-drafting' }),
      getPlayerView: () => Promise.resolve(null),
      // No-op subscribe — never invokes the callback. Refresh is the ONLY
      // path that can mutate hook state in this test.
      subscribe: () => () => {},
    }

    const { result } = renderHook(() => useGame(created.game.id, stub))

    // Initial load shows snapshot A.
    await waitFor(() => {
      expect(result.current.snapshot).not.toBeNull()
    })
    expect(result.current.snapshot?.picks).toHaveLength(0)
    expect(result.current.snapshot?.game.currentPick).toBe(0)
    expect(getCalls).toBe(1)

    // Without refresh, state would remain at A — there is no subscription
    // path. After refresh(), the hook must reflect snapshot B.
    await act(async () => {
      await result.current.refresh()
    })

    expect(getCalls).toBe(2)
    expect(result.current.snapshot?.picks).toHaveLength(1)
    expect(result.current.snapshot?.game.currentPick).toBe(1)
  })

  describe('currentTurn / bans / playerView', () => {
    it('all-pick: currentTurn is a collective pick turn (playerId null, team set); bans empty', async () => {
      const store = new LocalGameStore()
      const created = await store.createGame(allPickInput())

      const { result } = renderHook(() => useGame(created.game.id, store))
      await waitFor(() => expect(result.current.snapshot).not.toBeNull())

      const turn = result.current.currentTurn
      expect(turn).not.toBeNull()
      expect(turn?.kind).toBe('pick')
      // All-pick is now COLLECTIVE — the active team is what matters, not a
      // specific player. playerId is null; currentPickerId mirrors that.
      expect(turn?.playerId).toBeNull()
      expect(result.current.currentPickerId).toBeNull()
      expect(turn?.team === 'red' || turn?.team === 'blue').toBe(true)
      expect(result.current.bans).toEqual([])
    })

    it('pick-and-ban: currentTurn.kind=ban, playerId is null, currentPickerId is null, team is set', async () => {
      const store = new LocalGameStore()
      const created = await store.createGame(pickBanInput())

      const { result } = renderHook(() => useGame(created.game.id, store))
      await waitFor(() => expect(result.current.snapshot).not.toBeNull())

      const turn = result.current.currentTurn
      expect(turn).not.toBeNull()
      expect(turn?.kind).toBe('ban')
      expect(turn?.playerId).toBeNull()
      expect(result.current.currentPickerId).toBeNull()
      expect(turn?.team === 'red' || turn?.team === 'blue').toBe(true)
      expect(result.current.bans).toEqual([])
    })

    it('single-draft with token: exposes playerView with a 3-card hand for the matching player', async () => {
      const store = new LocalGameStore()
      const created = await store.createGame(singleDraftInput())
      const targetPlayer = created.players[0]
      const token = targetPlayer.token

      const { result } = renderHook(() => useGame(created.game.id, store, token))

      await waitFor(() => {
        expect(result.current.playerView).not.toBeNull()
      })

      expect(result.current.playerView?.player.id).toBe(targetPlayer.id)
      expect(result.current.playerView?.hand).not.toBeNull()
      expect(result.current.playerView?.hand?.length).toBe(3)
      expect(result.current.playerViewStatus).toBe('loaded')
    })

    it('settles playerViewStatus to "loaded" (not stuck on "loading") for a bogus token', async () => {
      const store = new LocalGameStore()
      const created = await store.createGame(singleDraftInput())

      // A token that does NOT match any player — the store returns null.
      const { result } = renderHook(() =>
        useGame(created.game.id, store, 'definitely-not-a-real-token'),
      )

      // Initially we expect 'loading' (a token is present so a fetch is queued).
      expect(result.current.playerViewStatus).toBe('loading')

      await waitFor(() => {
        expect(result.current.playerViewStatus).toBe('loaded')
      })
      // Bogus token resolves to a null playerView, not an error.
      expect(result.current.playerView).toBeNull()
    })

    it('settles playerViewStatus to "loaded" for a valid token on a method without hands (non-single-draft)', async () => {
      const store = new LocalGameStore()
      // all-pick has no hands; getPlayerView returns a view whose hand is null.
      const created = await store.createGame(allPickInput())
      const token = created.players[0].token

      const { result } = renderHook(() => useGame(created.game.id, store, token))

      await waitFor(() => {
        expect(result.current.playerViewStatus).toBe('loaded')
      })
      // The view itself is present (token matched) but hand is null.
      expect(result.current.playerView).not.toBeNull()
      expect(result.current.playerView?.hand).toBeNull()
    })

    it('no token: playerView stays null', async () => {
      const store = new LocalGameStore()
      const created = await store.createGame(singleDraftInput())

      const { result } = renderHook(() => useGame(created.game.id, store))
      await waitFor(() => expect(result.current.snapshot).not.toBeNull())

      expect(result.current.playerView).toBeNull()
      expect(result.current.playerViewStatus).toBe('idle')
    })

    it('bans surface after a ban is committed via the store', async () => {
      const store = new LocalGameStore()
      const created = await store.createGame(pickBanInput())

      const { result } = renderHook(() => useGame(created.game.id, store))
      await waitFor(() => expect(result.current.snapshot).not.toBeNull())

      const firstTurn = result.current.currentTurn
      expect(firstTurn?.kind).toBe('ban')
      const banTeam = firstTurn?.team
      const teamPlayer = created.players.find((p) => p.team === banTeam)
      if (!teamPlayer) throw new Error('expected a player on the active team')
      const heroToBan = created.game.heroPool[0]

      await act(async () => {
        const res = await store.makePick(created.game.id, teamPlayer.token, heroToBan)
        expect(res.ok).toBe(true)
      })

      await waitFor(() => {
        expect(result.current.bans).toContain(heroToBan)
      })
    })
  })
})
