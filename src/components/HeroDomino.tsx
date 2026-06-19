import type { JSX, MouseEvent } from 'react'
import type { Hero } from '@/types'
import { cn } from '@/components/ui'
import { heroImageUrl, heroMonogram, heroPlaceholderStyle } from '@/utils/heroArt'

export interface HeroDominoProps {
  hero: Hero
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  /** Accepted for layout compatibility; no longer affects rendering. */
  index?: number
}

const BASE_CLASSES =
  'group relative flex h-64 w-20 shrink-0 flex-col items-stretch overflow-hidden rounded-md border border-slate-700/70 bg-slate-900 text-left text-slate-100 shadow-md shadow-black/40 outline-none transition-transform transition-shadow duration-200 ease-out will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

// Carousel-style pop: tiles sit straight, then lift + grow UNIFORMLY on
// hover/focus. A uniform scale preserves the art's aspect (no distortion) and
// uses a transform (not width) so neighbours don't reflow.
const HOVER_TRANSFORM =
  'hover:-translate-y-3 hover:scale-[1.15] hover:z-20 hover:shadow-2xl hover:shadow-teal-900/50 hover:border-teal-500/70 focus-visible:-translate-y-3 focus-visible:scale-[1.15] focus-visible:z-20 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:scale-100 motion-reduce:focus-visible:translate-y-0'

const SELECTED_CLASSES =
  'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-amber-900/40 border-amber-400/80'

const DISABLED_CLASSES =
  'opacity-40 grayscale cursor-not-allowed pointer-events-none hover:scale-100 hover:translate-y-0'

export function HeroDomino({
  hero,
  selected = false,
  disabled = false,
  onClick,
}: HeroDominoProps): JSX.Element {
  const placeholder = heroPlaceholderStyle(hero.id)
  const portraitUrl = heroImageUrl(hero.imageId)
  const monogram = heroMonogram(hero.name)

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    if (disabled) {
      event.preventDefault()
      return
    }
    onClick?.()
  }

  return (
    <button
      type="button"
      aria-label={hero.name}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        BASE_CLASSES,
        !disabled && HOVER_TRANSFORM,
        selected && SELECTED_CLASSES,
        disabled && DISABLED_CLASSES,
      )}
    >
      {/* Portrait fallback layer (gradient + monogram) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-4xl font-black text-slate-100/30"
        style={placeholder}
      >
        {monogram}
      </div>

      {/* Portrait image layer (covers fallback when loaded) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${portraitUrl})` }}
      />

      {/* Top → bottom dark gradient for legibility */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent"
      />

      {/* Stars row */}
      <div className="relative z-10 flex justify-center px-1 pt-1.5 text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
        <span aria-label={`${hero.stars} stars`} className="text-xs leading-none tracking-tight">
          {'★'.repeat(hero.stars)}
        </span>
      </div>

      {/* Vertical hero name (rotated for the slim domino strip) */}
      <div className="relative z-10 mt-auto flex justify-center pb-2">
        <span
          className="block text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] [writing-mode:vertical-rl] [text-orientation:mixed] motion-reduce:[writing-mode:horizontal-tb]"
        >
          {hero.name}
        </span>
      </div>
    </button>
  )
}
