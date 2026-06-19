import type { JSX, MouseEvent } from 'react'
import type { Hero } from '@/types'
import { cn } from '@/components/ui'
import { heroImageUrl, heroMonogram, heroPlaceholderStyle } from '@/utils/heroArt'

export interface HeroDominoProps {
  hero: Hero
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  /** Optional position index — used to subtly stagger the lean. */
  index?: number
}

const BASE_CLASSES =
  'group relative flex h-64 w-20 shrink-0 flex-col items-stretch overflow-hidden rounded-md border border-slate-700/70 bg-slate-900 text-left text-slate-100 shadow-md shadow-black/40 outline-none transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

const LEANING_TRANSFORM =
  '-rotate-6 skew-y-1 motion-reduce:rotate-0 motion-reduce:skew-y-0 motion-reduce:transform-none'

const HOVER_TRANSFORM =
  'hover:rotate-0 hover:skew-y-0 hover:scale-105 hover:z-10 hover:shadow-xl hover:shadow-teal-900/40 hover:border-teal-500/70 focus-visible:rotate-0 focus-visible:skew-y-0 focus-visible:scale-105 focus-visible:z-10 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:rotate-0 motion-reduce:focus-visible:scale-100'

const SELECTED_CLASSES =
  'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-amber-900/40 border-amber-400/80'

const DISABLED_CLASSES =
  'opacity-40 grayscale cursor-not-allowed pointer-events-none hover:scale-100 hover:rotate-0'

export function HeroDomino({
  hero,
  selected = false,
  disabled = false,
  onClick,
  index = 0,
}: HeroDominoProps): JSX.Element {
  const placeholder = heroPlaceholderStyle(hero.id)
  const portraitUrl = heroImageUrl(hero.imageId)
  const monogram = heroMonogram(hero.name)

  // Subtle stagger: shift each domino slightly so they lean like a row.
  const offsetStyle = { marginLeft: index > 0 ? '-0.5rem' : undefined }

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
      style={offsetStyle}
      className={cn(
        BASE_CLASSES,
        LEANING_TRANSFORM,
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
