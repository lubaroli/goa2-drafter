import { useCallback, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import type { Hero, PickError, PublicPlayer } from '@/types'
import { useGame } from '@/hooks/useGame'
import { getHeroById } from '@/data/heroes'
import { heroesPerTeam as heroesPerTeamFor } from '@/services/draft'
import { HeroSelector } from '@/components/HeroSelector'
import { TeamRoster } from '@/components/TeamRoster'
import { Card, cn } from '@/components/ui'

/**
 * Map a `PickError` returned by the store/hook to user-facing copy. Kept as a
 * pure function so it's trivially testable and reusable.
 */
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

const STATUS_LABEL: Record<'setup' | 'drafting' | 'complete', string> = {
  setup: 'Setup',
  drafting: 'Drafting',
  complete: 'Complete',
}

interface FlashMessage {
  kind: 'error' | 'success'
  text: string
}

/**
 * The player's private draft screen.
 *
 * URL shape: `/play/:gameId?t=<playerToken>`
 *
 * Self-identification design note
 * --------------------------------
 * `GameSnapshot.players` is intentionally the `PublicPlayer` projection — it
 * does NOT carry per-player tokens (security: every participant reads the
 * snapshot). That means PlayerPage cannot resolve `t=...` → "which player am
 * I?" from the snapshot alone. Rather than leak tokens or add a parallel
 * client-side identity API, we treat `makePick(token, heroId)` as the
 * authoritative gate: the page enables picking whenever the game is drafting,
 * and surfaces the store's `'not-your-turn'` / `'invalid-token'` /
 * `'hero-unavailable'` results as friendly messages. The current picker is
 * still shown by name (looked up from `currentPickerId` in `snapshot.players`).
 */
export function PlayerPage(): JSX.Element {
  const params = useParams<{ gameId: string }>()
  const gameId = params.gameId
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t')

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

  const currentPicker: PublicPlayer | null = useMemo(() => {
    if (!snapshot || currentPickerId == null) return null
    return snapshot.players.find((p) => p.id === currentPickerId) ?? null
  }, [snapshot, currentPickerId])

  const onPick = useCallback(
    async (heroId: string): Promise<void> => {
      if (token == null || token === '') {
        setFlash({ kind: 'error', text: 'This link is missing its player token.' })
        return
      }
      const result = await makePick(token, heroId)
      if (result.ok) {
        const pickedHero = getHeroById(heroId)
        const heroName = pickedHero ? pickedHero.name : heroId
        setFlash({ kind: 'success', text: `Picked ${heroName}.` })
      } else {
        setFlash({ kind: 'error', text: pickErrorMessage(result.error) })
      }
    },
    [token, makePick],
  )

  // ---- Early UI states --------------------------------------------------

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

  if (token == null || token === '') {
    return (
      <PageShell>
        <Card aria-label="missing token">
          <h1 className="text-lg font-semibold text-amber-200">Missing player token</h1>
          <p className="mt-2 text-sm text-slate-300">
            This link is missing its player token. Please use the personal link the organiser sent
            you.
          </p>
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

  if (error != null || snapshot == null) {
    return (
      <PageShell>
        <Card aria-label="game error">
          <h1 className="text-lg font-semibold text-red-300">Game not found</h1>
          <p className="mt-2 text-sm text-slate-400">{error ?? 'Game not found'}</p>
        </Card>
      </PageShell>
    )
  }

  // ---- Main UI ----------------------------------------------------------

  const { game, players, picks } = snapshot
  const perTeam = heroesPerTeamFor(game.playerCount)
  const canPick = game.status === 'drafting' && !isComplete

  return (
    <PageShell>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Game <span className="font-mono text-amber-300">{game.id}</span>
          </h1>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider',
              isComplete
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-sky-500/15 text-sky-300',
            )}
            aria-label={`status ${STATUS_LABEL[game.status]}`}
          >
            {STATUS_LABEL[game.status]}
          </span>
        </div>

        {isComplete ? (
          <p className="text-base font-medium text-emerald-300" role="status">
            Draft complete!
          </p>
        ) : currentPicker ? (
          <p className="text-base text-slate-200" role="status" data-testid="current-pick-banner">
            Current pick:{' '}
            <span className="font-semibold text-slate-100">{currentPicker.name}</span>{' '}
            <span
              className={cn(
                'ml-1 rounded px-1.5 py-0.5 text-xs font-semibold uppercase',
                currentPicker.team === 'red'
                  ? 'bg-red-500/15 text-red-300'
                  : 'bg-blue-500/15 text-blue-300',
              )}
            >
              Team {currentPicker.team}
            </span>
          </p>
        ) : (
          <p className="text-sm text-slate-400" role="status">
            Waiting for the next pick…
          </p>
        )}
      </header>

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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      {isComplete ? (
        <Card aria-label="draft summary">
          <h2 className="text-base font-semibold text-slate-100">Final rosters</h2>
          <p className="mt-1 text-sm text-slate-400">
            All picks are in — see the team panels above.
          </p>
        </Card>
      ) : heroPool.length === 0 ? (
        <Card aria-label="empty pool">
          <p className="text-sm text-slate-300">No heroes are in this game's pool.</p>
        </Card>
      ) : (
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
      )}
    </PageShell>
  )
}

function PageShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">{children}</main>
  )
}
