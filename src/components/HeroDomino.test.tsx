import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeroDomino } from './HeroDomino'
import { getHeroById } from '@/data/heroes'

function getArien() {
  const hero = getHeroById('arien-the-tidemaster')
  if (!hero) throw new Error('test fixture missing: arien-the-tidemaster')
  return hero
}

describe('HeroDomino', () => {
  it('exposes the hero name as its accessible name', () => {
    const hero = getArien()
    render(<HeroDomino hero={hero} />)
    expect(screen.getByRole('button', { name: hero.name })).toBeInTheDocument()
  })

  it('fires onClick when enabled', () => {
    const hero = getArien()
    const onClick = vi.fn()
    render(<HeroDomino hero={hero} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: hero.name }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', () => {
    const hero = getArien()
    const onClick = vi.fn()
    render(<HeroDomino hero={hero} disabled onClick={onClick} />)
    const button = screen.getByRole('button', { name: hero.name })
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('reflects the selected state via aria-pressed', () => {
    const hero = getArien()
    const { rerender } = render(<HeroDomino hero={hero} />)
    expect(screen.getByRole('button', { name: hero.name })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    rerender(<HeroDomino hero={hero} selected />)
    expect(screen.getByRole('button', { name: hero.name })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('fires onClick exactly once per Enter keypress when focused', async () => {
    const user = userEvent.setup()
    const hero = getArien()
    const onClick = vi.fn()
    render(<HeroDomino hero={hero} onClick={onClick} />)
    const button = screen.getByRole('button', { name: hero.name })
    button.focus()
    expect(button).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fires onClick exactly once per Space keypress when focused', async () => {
    const user = userEvent.setup()
    const hero = getArien()
    const onClick = vi.fn()
    render(<HeroDomino hero={hero} onClick={onClick} />)
    const button = screen.getByRole('button', { name: hero.name })
    button.focus()
    expect(button).toHaveFocus()
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
