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

  it("renders BoardPage (not the global 404) for /board/:gameId even when the game doesn't exist", async () => {
    renderAt('/board/unknownid')
    // BoardPage shows its own "Game not found" card with the requested gameId,
    // which is distinct from the global NotFoundPage (which has no game code).
    expect(
      await screen.findByRole('heading', { name: /game not found/i, level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('unknownid')).toBeInTheDocument()
    // Sanity check: the global 404 page is *not* rendered.
    expect(screen.queryByText('404')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /back to home/i })).not.toBeInTheDocument()
  })
})
