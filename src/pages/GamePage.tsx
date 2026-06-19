import { useCallback, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import type { GameStatus, Hero, PickError, PublicPlayer, TeamId } from '@/types'
import { useGame } from '@/hooks/useGame'
import { getHeroById } from '@/data/heroes'
import { heroesPerTeam } from '@/services/draft'
import { HeroSelector } from '@/components/HeroSelector'
import { TeamRoster } from '@/components/TeamRoster'
import { Card, cn } from '@/components/ui'

/**
 * GamePage — a single screen for the whole group, used at `/play/:gameId`.
 *
 * - WITHOUT a `?t=<token>` query param it is the shared, read-only **board**:
 *   live team rosters + whose turn it is. Great for projecting on a TV. The
 *   old `/board/:gameId` route redirects here.
 * - WITH a valid `?t=<token>` it is additionally a **player's draft screen**:
 *   the hero selector appears so the holder can pick when it's their turn.
 *
 * Self-identification note: `GameSnapshot.players` is the token-free
 * `PublicPlayer` projection (every participant reads the snapshot), so the page
 * cannot resolve `t=...` → "which player am I?". We treat `makePick(token, …)`
 * as the authoritative gate and surface its `PickError` results as friendly
 * messages. The current picker is shown by name from `currentPickerId`.
 */

const TEAM_TEXT: Record<TeamId, string> = {
  red: 'text-red-300',
  blue: 'text-blue-300',
}

const TEAM_DOT: Record<TeamId, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
}

const STATUS_LABEL: Record<GameStatus, string> = {
  setup: 'Setup',
  drafting: 'Drafting',
  complete: 'Complete',
}

const STATUS_BADGE: Record<GameStatus, string> = {
  setup: 'border-slate-500/60 bg-slate-700/40 text-slate-200',
  drafting: 'border-amber-400/70 bg-amber-500/20 text-amber-200',
  complete: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200',
}

/** Map a `PickError` to user-facing copy. Pure + testable. */
const pickErrorMessage = (err: PickError): string => {
  switch (err) {
    case 'not-your-turn':
      return "It's not your turn yet."
    case 'hero-unavailable':
      return 'That hero was just taken.'
    case 'game-not-drafting':
      return 'This game is no longer accepting picks.'
    case 'invalid-token':
      return 'Your player link is invalid.'
    case 'game-not-found':
      return 'Game not found.'
    default:
      return 'Could not make that pick.'
  }
}

interface FlashMessage {
  kind: 'error' | 'success'
  text: string
}

function StatusBadge({ status }: { status: GameStatus }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold uppercase tracking-wider',
        STATUS_BADGE[status],
      )}
      data-testid="status-badge"
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

interface OnTheClockProps {
  picker: PublicPlayer | null
  isComplete: boolean
}

function OnTheClockBanner({ picker, isComplete }: OnTheClockProps): JSX.Element {
  if (isComplete) {
    return (
      <Card
        data-testid="on-the-clock-banner"
        className="flex items-center justify-center border-2 border-emerald-400/70 bg-emerald-500/10 py-6"
      >
        <span className="text-3xl font-extrabold uppercase tracking-widest text-emerald-200 sm:text-4xl">
          Draft Complete
        </span>
      </Card>
    )
  }

  if (!picker) {
    return (
      <Card
        data-testid="on-the-clock-banner"
        className="flex items-center justify-center border-2 border-slate-600/60 bg-slate-800/40 py-6"
      >
        <span className="text-2xl font-bold uppercase tracking-widest text-slate-300 sm:text-3xl">
          Waiting to start…
        </span>
      </Card>
    )
  }

  return (
    <Card
      data-testid="on-the-clock-banner"
      className="flex flex-col items-center justify-center gap-2 border-2 border-amber-400/70 bg-amber-500/10 py-6 sm:flex-row sm:gap-4"
    >
      <span className="text-sm font-bold uppercase tracking-widest text-amber-200 sm:text-base">
        On the clock
      </span>
      <span className="flex items-center gap-3">
        <span className={cn('h-3 w-3 rounded-full', TEAM_DOT[picker.team])} aria-hidden="true" />
        <span
          className={cn(
            'text-3xl font-extrabold uppercase tracking-wide sm:text-5xl',
            TEAM_TEXT[picker.team],
          )}
          data-testid="current-pick-banner"
        >
          {picker.name}
        </span>
      </span>
    </Card>
  )
}

export function GamePage(): JSX.Element {
  const { gameId } = useParams<{ gameId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t')
  const hasToken = token != null && token !== ''

  const { snapshot, loading, error, currentPickerId, isComplete, makePick } = useGame(gameId)

  const [flash, setFlash] = useState<FlashMessage | null>(null)

  const heroPool = useMemo<Hero[]>(() => {
    if (!snapshot) return []
    const out: Hero[] = []
    for (const id of snapshot.game.heroPool) {
      const hero = getHeroById(id)
      if (hero) out.push(hero)
    }
    return out
  }, [snapshot])

  const pickedHeroIds = useMemo<string[]>(
    () => (snapshot ? snapshot.picks.map((p) => p.heroId) : []),
    [snapshot],
  )

  const onPick = useCallback(
    async (heroId: string): Promise<void> => {
      if (!hasToken) return
      const result = await makePick(token, heroId)
      if (result.ok) {
        const pickedHero = getHeroById(heroId)
        setFlash({ kind: 'success', text: `Picked ${pickedHero ? pickedHero.name : heroId}.` })
      } else {
        setFlash({ kind: 'error', text: pickErrorMessage(result.error) })
      }
    },
    [hasToken, token, makePick],
  )

  if (gameId === undefined || gameId === '') {
    return (
      <PageShell>
        <Card>
          <h1 className="text-lg font-semibold text-slate-100">Game not found</h1>
          <p className="mt-2 text-sm text-slate-400">No game id was provided in the URL.</p>
        </Card>
      </PageShell>
    )
  }

  if (loading) {
    return (
      <PageShell>
        <Card aria-label="loading">
          <p className="text-sm text-slate-300" role="status">
            Loading game…
          </p>
        </Card>
      </PageShell>
    )
  }

  if (error !== null || snapshot === null) {
    return (
      <PageShell>
        <Card aria-label="game error" className="border-2 border-red-500/60 bg-red-950/30">
          <h1 className="text-lg font-semibold text-red-300">Game not found</h1>
          <p className="mt-2 text-sm text-slate-400">{error ?? 'No game matches this code.'}</p>
        </Card>
      </PageShell>
    )
  }

  const { game, players, picks } = snapshot
  const perTeam = heroesPerTeam(game.playerCount)
  const picker = currentPickerId ? (players.find((p) => p.id === currentPickerId) ?? null) : null
  // The selector only appears for a token holder during an active draft.
  const canPick = hasToken && game.status === 'drafting' && !isComplete
  const showSelector = hasToken && !isComplete && heroPool.length > 0

  return (
    <PageShell>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold uppercase tracking-wide text-slate-100 sm:text-4xl">
            Guards of Atlantis II
          </h1>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="text-sm font-semibold uppercase tracking-widest">Game</span>
            <code
              data-testid="game-code"
              className="rounded bg-slate-800/80 px-3 py-1 font-mono text-lg font-bold text-teal-300"
            >
              {game.id}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={game.status} />
          <span
            data-testid="pick-progress"
            className="rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-sm font-semibold uppercase tracking-wider text-slate-200"
          >
            Pick {picks.length} of {game.playerCount}
          </span>
        </div>
      </header>

      <OnTheClockBanner picker={picker} isComplete={isComplete} />

      {flash ? (
        <div
          role="alert"
          className={cn(
            'rounded-lg border px-3 py-2 text-sm',
            flash.kind === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-200'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
          )}
        >
          {flash.text}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TeamRoster
          team="red"
          players={players}
          picks={picks}
          heroesPerTeam={perTeam}
          currentPlayerId={currentPickerId}
        />
        <TeamRoster
          team="blue"
          players={players}
          picks={picks}
          heroesPerTeam={perTeam}
          currentPlayerId={currentPickerId}
        />
      </section>

      {showSelector ? (
        <section aria-label="hero selector">
          <HeroSelector
            heroes={heroPool}
            pickedHeroIds={pickedHeroIds}
            canPick={canPick}
            onPick={(heroId) => {
              void onPick(heroId)
            }}
          />
        </section>
      ) : null}
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 bg-slate-950 p-4 text-slate-100 sm:p-6">
      {children}
    </main>
  )
}
