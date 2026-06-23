import type { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBackground } from '@/components/AppBackground'
import { artUrl } from '@/utils/heroArt'
import { Button, Card } from '@/components/ui'

/**
 * Landing page for the GoA2 Drafter. Explains the no-login flow and lets the
 * organiser start a fresh setup. Game persistence happens at the very end of
 * the wizard (SetupPage), so this button just navigates with no side effects.
 *
 * The Guards of Atlantis II logo + scene comes from the page background
 * (`AppBackground` hero variant); content sits over its dark lower portion.
 */
export function HomePage(): JSX.Element {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen text-slate-100">
      <AppBackground variant="muted" />
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12">
        <header className="mb-8 flex w-full flex-col items-center text-center">
          {/* Full GoA2 Drafter logo — crest, "Guards of Atlantis" banner, and
              "Drafter" title all in one transparent image. */}
          <h1 className="w-full">
            <img
              src={artUrl('goa2-drafter-logo.webp')}
              alt="Guards of Atlantis II — Drafter"
              className="mx-auto w-full max-w-lg drop-shadow-[0_6px_24px_rgba(0,0,0,0.6)]"
            />
          </h1>
          <p className="-mt-2 max-w-xl text-lg text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            Set up teams, build a hero pool, and run any of six draft methods &mdash; all from a
            single shared link.
          </p>
        </header>

        <Card className="w-full bg-slate-900/80 backdrop-blur-sm">
          <div className="space-y-4 p-2">
            <h2 className="text-xl font-semibold text-teal-300">How it works</h2>
            <ol className="list-decimal space-y-2 pl-5 text-slate-300">
              <li>Pick player count, names, and teams.</li>
              <li>Choose which hero packs, or individual heroes, are in play.</li>
              <li>Pick a draft method &mdash; snake, random, all-pick, and more.</li>
              <li>Share the generated links with your group.</li>
            </ol>
            <p className="rounded-md border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
              No logins needed &mdash; each player gets a magic link to pick their hero, and anyone
              with the game code can see the current selections.
            </p>
            <div className="flex justify-center pt-2">
              <Button
                size="lg"
                onClick={() => {
                  navigate('/setup')
                }}
              >
                Create a new game
              </Button>
            </div>
          </div>
        </Card>

        <footer className="mt-10 text-center text-xs text-slate-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          Unofficial fan tool. Guards of Atlantis II is a trademark of its respective owner.
        </footer>
      </div>
    </div>
  )
}
