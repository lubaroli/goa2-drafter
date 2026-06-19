import type { JSX } from 'react'
import { useParams } from 'react-router-dom'
import type { GameStatus, PublicPlayer, TeamId } from '@/types'
import { useGame } from '@/hooks/useGame'
import { heroesPerTeam } from '@/services/draft'
import { TeamRoster } from '@/components/TeamRoster'
import { Card, cn } from '@/components/ui'

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
        <span
          className={cn('h-3 w-3 rounded-full', TEAM_DOT[picker.team])}
          aria-hidden="true"
        />
        <span
          className={cn(
            'text-3xl font-extrabold uppercase tracking-wide sm:text-5xl',
            TEAM_TEXT[picker.team],
          )}
        >
          {picker.name}
        </span>
      </span>
    </Card>
  )
}

export function BoardPage(): JSX.Element {
  const { gameId } = useParams<{ gameId: string }>()
  const { snapshot, loading, error, currentPickerId, isComplete } = useGame(gameId)

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-slate-300">
        <span className="text-2xl font-semibold uppercase tracking-widest">Loading…</span>
      </main>
    )
  }

  if (error !== null || snapshot === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8">
        <Card className="flex flex-col items-center gap-3 border-2 border-red-500/60 bg-red-950/30 px-8 py-6 text-center">
          <h1 className="text-3xl font-extrabold uppercase tracking-wide text-red-200">
            Game not found
          </h1>
          <p className="text-base text-slate-300">
            {error ?? 'No game matches this code.'}
          </p>
          {gameId !== undefined ? (
            <code className="rounded bg-slate-900/60 px-2 py-1 text-sm text-slate-400">
              {gameId}
            </code>
          ) : null}
        </Card>
      </main>
    )
  }

  const { game, players, picks } = snapshot
  const perTeam = heroesPerTeam(game.playerCount)
  const totalPicks = game.playerCount
  const picksMade = picks.length
  const picker = currentPickerId
    ? players.find((p) => p.id === currentPickerId) ?? null
    : null

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold uppercase tracking-wide text-slate-100 sm:text-5xl">
              Guards of Atlantis II
            </h1>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="text-sm font-semibold uppercase tracking-widest">Game</span>
              <code
                data-testid="game-code"
                className="rounded bg-slate-800/80 px-3 py-1 font-mono text-lg font-bold text-teal-300 sm:text-xl"
              >
                {game.id}
              </code>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={game.status} />
            <span
              data-testid="pick-progress"
              className="rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-sm font-semibold uppercase tracking-wider text-slate-200 sm:text-base"
            >
              Pick {picksMade} of {totalPicks}
            </span>
          </div>
        </header>

        <OnTheClockBanner picker={picker} isComplete={isComplete} />

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
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
      </div>
    </main>
  )
}
