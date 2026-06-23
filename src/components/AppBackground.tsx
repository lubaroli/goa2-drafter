import type { JSX } from 'react'
import { artUrl } from '@/utils/heroArt'

interface AppBackgroundProps {
  /**
   * How strongly to dim the artwork. `'hero'` (default) keeps the scene
   * visible for the landing page; `'muted'` pushes it further back so dense
   * UI (the draft board, hero cards) stays readable on top.
   */
  variant?: 'hero' | 'muted'
}

/**
 * Fixed, full-viewport background layer. Renders the Guards of Atlantis II
 * scene (top-anchored, cover) behind a dark gradient overlay that deepens
 * toward the bottom so foreground content always has contrast. Sits behind
 * everything (`-z-10`) and ignores pointer events.
 */
export function AppBackground({ variant = 'hero' }: AppBackgroundProps): JSX.Element {
  const overlay =
    variant === 'muted'
      ? 'bg-gradient-to-b from-slate-950/70 via-slate-950/80 to-slate-950'
      : 'bg-gradient-to-b from-slate-950/40 via-slate-950/70 to-slate-950'

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-top bg-no-repeat"
        style={{ backgroundImage: `url(${artUrl('goa2-bg.webp')})` }}
      />
      <div className={`absolute inset-0 ${overlay}`} />
    </div>
  )
}
