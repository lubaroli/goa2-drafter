import type {
  CreateGameInput,
  DraftMethod,
  Game,
  GameSnapshot,
  GameStatus,
  GameStore,
  Pick,
  PickError,
  PickResult,
  Player,
  PublicPlayer,
  TeamId,
} from '@/types'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { buildSnakeDraftOrder, randomAssignment } from '@/services/draft'
import { generateGameCode, generateToken } from '@/utils/ids'

// ---------------------------------------------------------------------------
// Database row shapes (snake_case columns as stored in Postgres)
// ---------------------------------------------------------------------------

/** Row shape of the `games` table. */
export interface GameRow {
  id: string
  status: GameStatus
  player_count: number
  method: DraftMethod
  hero_pool: string[]
  draft_order: string[]
  current_pick: number
  organiser_token: string
  created_at: string
}

/**
 * Row shape projected for snapshots — token is intentionally omitted so it
 * never escapes via `getSnapshot` or the `make_pick` RPC payload (see
 * `PublicPlayer` in @/types). Use `PlayerRow` only on the create-game write
 * path where the organiser-side full record is required.
 */
export interface PublicPlayerRow {
  id: string
  game_id: string
  name: string
  team: TeamId
  seat: number
}

/** Full row shape of the `players` table (includes the auth `token`). */
export interface PlayerRow extends PublicPlayerRow {
  token: string
}

/** Row shape of the `picks` table. */
export interface PickRow {
  id: string
  game_id: string
  player_id: string
  hero_id: string
  pick_index: number | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Mappers (DB rows ⇄ domain types)
// ---------------------------------------------------------------------------

/** Map a DB games row → domain `Game`. */
export const gameFromRow = (row: GameRow): Game => ({
  id: row.id,
  status: row.status,
  playerCount: row.player_count,
  method: row.method,
  heroPool: [...row.hero_pool],
  draftOrder: [...row.draft_order],
  currentPick: row.current_pick,
  createdAt: Date.parse(row.created_at),
})

/**
 * Map a token-free DB players row → `PublicPlayer`. Used by the snapshot
 * read path; tokens never leave the server through this projection.
 */
export const publicPlayerFromRow = (row: PublicPlayerRow): PublicPlayer => ({
  id: row.id,
  name: row.name,
  team: row.team,
  seat: row.seat,
})

/**
 * Map a full DB players row → domain `Player` (with token). Used only on the
 * create-game return path so the organiser can build per-player magic links.
 */
export const playerFromRow = (row: PlayerRow): Player => ({
  ...publicPlayerFromRow(row),
  token: row.token,
})

/** Map a DB picks row → domain `Pick`. */
export const pickFromRow = (row: PickRow): Pick => ({
  id: row.id,
  playerId: row.player_id,
  heroId: row.hero_id,
  pickIndex: row.pick_index,
  createdAt: Date.parse(row.created_at),
})

// ---------------------------------------------------------------------------
// RPC payload shape returned by the `make_pick` SECURITY DEFINER function
// ---------------------------------------------------------------------------

interface MakePickErrorPayload {
  error: PickError
}

interface MakePickSuccessPayload {
  game: GameRow
  /** Token-free projection — see schema.sql `make_pick`. */
  players: PublicPlayerRow[]
  picks: PickRow[]
}

type MakePickPayload = MakePickErrorPayload | MakePickSuccessPayload

const isPickError = (value: unknown): value is PickError =>
  value === 'not-your-turn' ||
  value === 'hero-unavailable' ||
  value === 'game-not-drafting' ||
  value === 'invalid-token' ||
  value === 'game-not-found'

// ---------------------------------------------------------------------------
// SupabaseGameStore
// ---------------------------------------------------------------------------

/**
 * Supabase-backed implementation of `GameStore`.
 *
 * Storage layout — three tables: `games`, `players`, `picks` (see
 * `supabase/schema.sql`). Mappers above translate snake_case columns to the
 * camelCase domain types.
 *
 * Concurrency: `makePick` delegates to a Postgres `make_pick` RPC that runs
 * with `SECURITY DEFINER` and locks the game row with `SELECT ... FOR UPDATE`,
 * giving us atomic validate-and-commit in a single round trip and returning
 * the updated snapshot in the same response.
 *
 * Realtime: `subscribe` listens to `postgres_changes` on all three tables
 * filtered by `game_id` (and `id` for the games table) and re-fetches the
 * snapshot on any event. This is simpler than reconstructing partial state
 * from change payloads and keeps the source of truth in one query path.
 *
 * Token hygiene: snapshots returned by `getSnapshot` and the `make_pick` RPC
 * payload contain `PublicPlayer[]` only — never the per-player auth token.
 * Tokens are returned exactly once, to the organiser, from `createGame`.
 *
 * Pick mutations: the `picks` table is locked down (no anon INSERT) — both
 * snake-method (`make_pick`) and random-method (`seed_random_picks`)
 * pick writes go through SECURITY DEFINER RPCs.
 *
 * NOTE on createGame atomicity: the supabase-js client cannot run a multi-table
 * transaction. We insert games → players, then call `seed_random_picks` for
 * the random method. If a later step fails the partial rows remain; for this
 * app's scale (a few co-located users creating a single game) this is
 * acceptable. A future hardening would fold the whole create flow into one
 * SECURITY DEFINER RPC.
 */
export class SupabaseGameStore implements GameStore {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async createGame(
    input: CreateGameInput,
  ): Promise<{ game: Game; organiserToken: string; players: Player[] }> {
    const id = generateGameCode()
    const organiserToken = generateToken()
    const now = new Date().toISOString()

    const players: Player[] = input.players.map((p) => ({
      id: generateToken(),
      name: p.name,
      team: p.team,
      seat: p.seat,
      token: generateToken(),
    }))

    let game: Game
    let picks: Pick[]

    if (input.method === 'snake') {
      const draftOrder = buildSnakeDraftOrder(players)
      game = {
        id,
        status: 'drafting',
        playerCount: input.playerCount,
        method: 'snake',
        heroPool: [...input.heroPool],
        draftOrder,
        currentPick: 0,
        createdAt: Date.parse(now),
      }
      picks = []
    } else {
      const ordered = [...players].sort((a, b) => a.seat - b.seat)
      const assignment = randomAssignment(
        ordered.map((p) => p.id),
        input.heroPool,
      )
      picks = ordered.map((p) => ({
        id: generateToken(),
        playerId: p.id,
        heroId: assignment[p.id] as string,
        pickIndex: null,
        createdAt: Date.parse(now),
      }))
      game = {
        id,
        status: 'complete',
        playerCount: input.playerCount,
        method: 'random',
        heroPool: [...input.heroPool],
        draftOrder: [],
        currentPick: 0,
        createdAt: Date.parse(now),
      }
    }

    // Insert sequentially. See class-level NOTE on atomicity.
    const gameRow: GameRow = {
      id: game.id,
      status: game.status,
      player_count: game.playerCount,
      method: game.method,
      hero_pool: game.heroPool,
      draft_order: game.draftOrder,
      current_pick: game.currentPick,
      organiser_token: organiserToken,
      created_at: now,
    }
    const { error: gameErr } = await this.client.from('games').insert(gameRow)
    if (gameErr) throw new Error(`createGame: failed to insert game: ${gameErr.message}`)

    const playerRows: PlayerRow[] = players.map((p) => ({
      id: p.id,
      game_id: game.id,
      name: p.name,
      team: p.team,
      token: p.token,
      seat: p.seat,
    }))
    const { error: playersErr } = await this.client.from('players').insert(playerRows)
    if (playersErr) throw new Error(`createGame: failed to insert players: ${playersErr.message}`)

    if (picks.length > 0) {
      // Random-method picks are inserted via a SECURITY DEFINER RPC rather
      // than a direct table insert. The `picks` table is locked down — anon
      // INSERT is intentionally not granted (see schema.sql) — because the
      // snake-draft path goes through `make_pick`. The `seed_random_picks`
      // RPC checks the organiser token and that no picks already exist for
      // the game, then writes the rows server-side.
      const assignments = picks.map((pk) => ({ player_id: pk.playerId, hero_id: pk.heroId }))
      const { error: seedErr } = await this.client.rpc('seed_random_picks', {
        p_game_id: game.id,
        p_organiser_token: organiserToken,
        p_assignments: assignments,
      })
      if (seedErr) throw new Error(`createGame: failed to seed random picks: ${seedErr.message}`)
    }

    return { game, organiserToken, players }
  }

  async getSnapshot(gameId: string): Promise<GameSnapshot | null> {
    const { data: gameRow, error: gameErr } = await this.client
      .from('games')
      .select('*')
      .eq('id', gameId)
      .maybeSingle<GameRow>()
    if (gameErr) throw new Error(`getSnapshot: ${gameErr.message}`)
    if (!gameRow) return null

    // Token-free projection — never expose `players.token` to the snapshot
    // (which is shared among all participants).
    const { data: playerRows, error: playersErr } = await this.client
      .from('players')
      .select('id, game_id, name, team, seat')
      .eq('game_id', gameId)
    if (playersErr) throw new Error(`getSnapshot players: ${playersErr.message}`)

    const { data: pickRows, error: picksErr } = await this.client
      .from('picks')
      .select('*')
      .eq('game_id', gameId)
    if (picksErr) throw new Error(`getSnapshot picks: ${picksErr.message}`)

    return {
      game: gameFromRow(gameRow),
      players: ((playerRows as PublicPlayerRow[] | null) ?? []).map(publicPlayerFromRow),
      picks: ((pickRows as PickRow[] | null) ?? []).map(pickFromRow),
    }
  }

  async makePick(gameId: string, playerToken: string, heroId: string): Promise<PickResult> {
    const { data, error } = await this.client.rpc('make_pick', {
      p_game_id: gameId,
      p_player_token: playerToken,
      p_hero_id: heroId,
    })
    if (error) throw new Error(`makePick rpc: ${error.message}`)

    const payload = data as MakePickPayload | null
    if (!payload) throw new Error('makePick: empty rpc response')

    if ('error' in payload) {
      const code: unknown = payload.error
      if (isPickError(code)) return { ok: false, error: code }
      throw new Error(`makePick: unknown error code from rpc: ${String(code)}`)
    }

    const snapshot: GameSnapshot = {
      game: gameFromRow(payload.game),
      players: payload.players.map(publicPlayerFromRow),
      picks: payload.picks.map(pickFromRow),
    }
    return { ok: true, snapshot }
  }

  subscribe(gameId: string, cb: (snap: GameSnapshot) => void): () => void {
    let cancelled = false

    const refetch = (): void => {
      void this.getSnapshot(gameId).then((snap) => {
        if (!cancelled && snap) cb(snap)
      })
    }

    const channel: RealtimeChannel = this.client
      .channel(`game:${gameId}`)
      // The `postgres_changes` filter type isn't fully captured by supabase-js
      // generics; the runtime accepts the union of options used here.
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        refetch,
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        refetch,
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'picks', filter: `game_id=eq.${gameId}` },
        refetch,
      )
      .subscribe()

    return (): void => {
      cancelled = true
      void this.client.removeChannel(channel)
    }
  }
}
