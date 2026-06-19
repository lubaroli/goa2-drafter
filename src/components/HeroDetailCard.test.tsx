import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HeroDetailCard } from './HeroDetailCard'
import { getHeroById } from '@/data/heroes'
import { HERO_PACKS } from '@/data/packs'

function getArien() {
  const hero = getHeroById('arien-the-tidemaster')
  if (!hero) throw new Error('test fixture missing: arien-the-tidemaster')
  return hero
}

describe('HeroDetailCard', () => {
  it('renders the hero name, pack name, role chips and stat readouts', () => {
    const hero = getArien()
    const packName = HERO_PACKS.find((p) => p.id === hero.pack)?.name ?? ''
    render(<HeroDetailCard hero={hero} />)

    // Name + pack
    expect(screen.getByRole('heading', { name: hero.name })).toBeInTheDocument()
    expect(screen.getByText(packName)).toBeInTheDocument()

    // Every role appears as a non-interactive label (NOT a switch)
    for (const role of hero.roles) {
      expect(screen.getByText(role)).toBeInTheDocument()
      expect(screen.queryByRole('switch', { name: role })).not.toBeInTheDocument()
    }

    // Stat bars
    expect(screen.getByRole('progressbar', { name: /attack/i })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /initiative/i })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /defense/i })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /movement/i })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /total/i })).toBeInTheDocument()

    // Spot-check a stat readout (Attack base 8 for Arien)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('disables the Pick button when canPick is false', () => {
    const hero = getArien()
    const onPick = vi.fn()
    render(<HeroDetailCard hero={hero} canPick={false} onPick={onPick} />)
    const pick = screen.getByRole('button', { name: /pick this hero/i })
    expect(pick).toBeDisabled()
    fireEvent.click(pick)
    expect(onPick).not.toHaveBeenCalled()
  })

  it('enables the Pick button and calls onPick when canPick is true', () => {
    const hero = getArien()
    const onPick = vi.fn()
    render(<HeroDetailCard hero={hero} canPick onPick={onPick} />)
    const pick = screen.getByRole('button', { name: /pick this hero/i })
    expect(pick).not.toBeDisabled()
    fireEvent.click(pick)
    expect(onPick).toHaveBeenCalledTimes(1)
  })

  it('fires onClose when the close control is activated', () => {
    const hero = getArien()
    const onClose = vi.fn()
    render(<HeroDetailCard hero={hero} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close hero details/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
