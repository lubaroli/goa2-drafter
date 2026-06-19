import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './App'

const clearStorage = (): void => {
  const ls = (globalThis as { localStorage?: Storage }).localStorage
  if (ls) ls.clear()
}

const renderAt = (path: string): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('AppRoutes', () => {
  beforeEach(() => {
    clearStorage()
  })

  it('renders HomePage at /', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: /drafter/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create a new game/i })).toBeInTheDocument()
  })

  it('renders NotFoundPage for an unknown route', () => {
    renderAt('/nonsense')
    expect(screen.getByRole('heading', { name: /page not found/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/')
  })

  it('redirects /board/:gameId to /play/:gameId (GamePage), not the global 404', async () => {
    renderAt('/board/unknownid')
    // /board now redirects to /play; GamePage shows its own "Game not found"
    // card, which is distinct from the global NotFoundPage.
    expect(
      await screen.findByRole('heading', { name: /game not found/i, level: 1 }),
    ).toBeInTheDocument()
    // Sanity check: the global 404 page is *not* rendered.
    expect(screen.queryByText('404')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /back to home/i })).not.toBeInTheDocument()
  })

  it('renders GamePage (not the global 404) for /play/:gameId when the game does not exist', async () => {
    renderAt('/play/unknownid')
    expect(
      await screen.findByRole('heading', { name: /game not found/i, level: 1 }),
    ).toBeInTheDocument()
    expect(screen.queryByText('404')).not.toBeInTheDocument()
  })
})
