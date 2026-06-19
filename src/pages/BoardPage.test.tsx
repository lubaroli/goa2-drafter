import { describe, expect, it, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { CreateGameInput, Player } from '@/types'
import { gameStore } from '@/services/store'
import { nextPickerId } from '@/services/draft'
import { BoardPage } from './BoardPage'

const clearStorage = (): void => {
  const ls = (globalThis as { localStorage?: Storage }).localStorage
  if (ls) ls.clear()
}

const fourPlayerInput = (): CreateGameInput => ({
  playerCount: 4,
  method: 'snake',
  heroPool: [
    'arien-the-tidemaster',
    'brogan-the-destroyer',
    'wasp-the-warmaiden',
    'casiana-the-stormbringer',
    'darkseer-eclipse',
    'erika-the-hunter',
  ],
  players: [
    { name: 'Alice', team: 'red', seat: 0 },
    { name: 'Bob', team: 'blue', seat: 1 },
    { name: 'Carol', team: 'red', seat: 2 },
    { name: 'Dan', team: 'blue', seat: 3 },
  ],
})

const renderBoard = (gameId: string): void => {
  render(
    <MemoryRouter initialEntries={[`/board/${gameId}`]}>
      <Routes>
        <Route path="/board/:gameId" element={<BoardPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BoardPage', () => {
  beforeEach(() => {
    clearStorage()
  })

  it('renders both team rosters and the game code', async () => {
    const { game } = await gameStore.createGame(fourPlayerInput())

    renderBoard(game.id)

    await waitFor(() => {
      expect(screen.getByLabelText(/red team roster/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/blue team roster/i)).toBeInTheDocument()
    // Game code is the short shareable id.
    expect(screen.getByText(new RegExp(game.id, 'i'))).toBeInTheDocument()
  })

  it('shows the on-the-clock banner naming the first picker', async () => {
    const { game, players } = await gameStore.createGame(fourPlayerInput())
    const firstPickerId = nextPickerId(game.draftOrder, 0)
    const firstPicker = players.find((p: Player) => p.id === firstPickerId)
    expect(firstPicker).toBeDefined()

    renderBoard(game.id)

    await waitFor(() => {
      const banner = screen.getByTestId('on-the-clock-banner')
      expect(banner).toHaveTextContent(/on the clock/i)
      expect(banner).toHaveTextContent(firstPicker!.name)
    })
  })

  it('shows pick progress "Pick 0 of 4" initially', async () => {
    const { game } = await gameStore.createGame(fourPlayerInput())

    renderBoard(game.id)

    await waitFor(() => {
      expect(screen.getByText(/pick\s*0\s*of\s*4/i)).toBeInTheDocument()
    })
  })

  it('renders a not-found message for an unknown game id', async () => {
    renderBoard('does-not-exist')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
    })
  })

  it('updates live when a pick is made directly via the store', async () => {
    const { game, players } = await gameStore.createGame(fourPlayerInput())
    const firstPickerId = nextPickerId(game.draftOrder, 0)
    const firstPicker = players.find((p: Player) => p.id === firstPickerId)!

    renderBoard(game.id)

    await waitFor(() => {
      expect(screen.getByText(/pick\s*0\s*of\s*4/i)).toBeInTheDocument()
    })

    // Make a pick directly via the store; the board should reflect it without manual refresh.
    // Wrap in act() because the store's subscription fires a synchronous React state update
    // that would otherwise log warnings (and risk cross-file flakiness on parallel runs).
    let result: Awaited<ReturnType<typeof gameStore.makePick>> | undefined
    await act(async () => {
      result = await gameStore.makePick(game.id, firstPicker.token, 'arien-the-tidemaster')
    })
    expect(result?.ok).toBe(true)

    await waitFor(() => {
      expect(screen.getByText(/pick\s*1\s*of\s*4/i)).toBeInTheDocument()
    })
    expect(screen.getByText('Arien the Tidemaster')).toBeInTheDocument()
  })
})
