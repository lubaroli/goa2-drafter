import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { CreateGameInput, Player } from '@/types'
import { gameStore } from '@/services/store'
import { HEROES } from '@/data/heroes'
import { PlayerPage } from './PlayerPage'

interface CreatedGame {
  gameId: string
  players: Player[]
  draftOrder: string[]
  pool: string[]
}

const POOL_IDS = HEROES.slice(0, 8).map((h) => h.id)

const createSnakeGame = async (): Promise<CreatedGame> => {
  const input: CreateGameInput = {
    playerCount: 4,
    method: 'snake',
    heroPool: POOL_IDS,
    players: [
      { name: 'Alice', team: 'red', seat: 1 },
      { name: 'Bob', team: 'blue', seat: 1 },
      { name: 'Carol', team: 'red', seat: 2 },
      { name: 'Dave', team: 'blue', seat: 2 },
    ],
  }
  const { game, players } = await gameStore.createGame(input)
  return { gameId: game.id, players, draftOrder: game.draftOrder, pool: game.heroPool }
}

const renderAt = (gameId: string, token: string | null): void => {
  const search = token === null ? '' : `?t=${encodeURIComponent(token)}`
  render(
    <MemoryRouter initialEntries={[`/play/${gameId}${search}`]}>
      <Routes>
        <Route path="/play/:gameId" element={<PlayerPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  // The singleton store reads/writes localStorage; clear it so each test sees
  // a clean slate even though it shares the singleton instance.
  globalThis.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('PlayerPage', () => {
  it('renders both team rosters and the current-pick banner naming the first picker', async () => {
    const { gameId, players, draftOrder } = await createSnakeGame()
    const firstPicker = players.find((p) => p.id === draftOrder[0])!

    renderAt(gameId, players[0].token)

    // Banner names the first picker.
    const banner = await screen.findByTestId('current-pick-banner')
    expect(within(banner).getByText(firstPicker.name)).toBeInTheDocument()
    expect(within(banner).getByText(/team (red|blue)/i)).toBeInTheDocument()

    // Both team rosters present.
    expect(screen.getByLabelText(/red team roster/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/blue team roster/i)).toBeInTheDocument()
    // Game id appears in the header.
    expect(screen.getByText(gameId)).toBeInTheDocument()
  })

  it('renders the HeroSelector with the pool heroes and disables picked heroes', async () => {
    const { gameId, players, draftOrder, pool } = await createSnakeGame()

    // Have the first picker take the first hero so it shows as picked.
    const firstPicker = players.find((p) => p.id === draftOrder[0])!
    const pickedHeroId = pool[0]
    const result = await gameStore.makePick(gameId, firstPicker.token, pickedHeroId)
    expect(result.ok).toBe(true)

    renderAt(gameId, players[0].token)

    // Wait for the pool to render.
    await waitFor(() => {
      expect(screen.getByLabelText('Hero selection')).toBeInTheDocument()
    })

    // Each remaining pool hero has a domino.
    for (const heroId of pool.slice(1)) {
      const hero = HEROES.find((h) => h.id === heroId)!
      expect(screen.getByRole('button', { name: hero.name })).toBeInTheDocument()
    }

    // The picked hero's domino is disabled.
    const pickedHero = HEROES.find((h) => h.id === pickedHeroId)!
    const pickedBtn = screen.getByRole('button', { name: pickedHero.name })
    expect(pickedBtn).toBeDisabled()
  })

  it("shows a 'not your turn' message when picking with a non-current player's token", async () => {
    const user = userEvent.setup()
    const { gameId, players, draftOrder, pool } = await createSnakeGame()

    // Pick a token that is NOT the current picker's.
    const wrongPlayer = players.find((p) => p.id !== draftOrder[0])!
    renderAt(gameId, wrongPlayer.token)

    // Open a hero detail card and click pick.
    const targetHero = HEROES.find((h) => h.id === pool[0])!
    const domino = await screen.findByRole('button', { name: targetHero.name })
    await user.click(domino)
    const pickBtn = await screen.findByRole('button', { name: /pick this hero/i })
    await user.click(pickBtn)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/it's not your turn yet/i)
  })

  it('successfully picks when the correct (current) player makes a pick', async () => {
    const user = userEvent.setup()
    const { gameId, players, draftOrder, pool } = await createSnakeGame()

    const firstPicker = players.find((p) => p.id === draftOrder[0])!
    renderAt(gameId, firstPicker.token)

    const targetHero = HEROES.find((h) => h.id === pool[0])!
    const domino = await screen.findByRole('button', { name: targetHero.name })
    await user.click(domino)
    const pickBtn = await screen.findByRole('button', { name: /pick this hero/i })
    await user.click(pickBtn)

    // Success flash.
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(new RegExp(`picked ${targetHero.name}`, 'i'))

    // Roster slot for the first picker now shows the picked hero name.
    const slot = await screen.findByTestId(`roster-slot-${firstPicker.id}`)
    expect(within(slot).getByText(targetHero.name)).toBeInTheDocument()

    // Banner has advanced — the next picker's name is shown (not the same player twice in row 0).
    const nextPicker = players.find((p) => p.id === draftOrder[1])!
    const banner = await screen.findByTestId('current-pick-banner')
    expect(within(banner).getByText(nextPicker.name)).toBeInTheDocument()
  })

  it('shows the missing-token message when ?t= is absent', async () => {
    const { gameId } = await createSnakeGame()
    renderAt(gameId, null)
    expect(await screen.findByText(/missing player token/i)).toBeInTheDocument()
    expect(screen.getByText(/missing its player token/i)).toBeInTheDocument()
  })

  it('shows a not-found message for an unknown game id', async () => {
    renderAt('NOPE-NO-SUCH-GAME', 'irrelevant-token')
    // useGame surfaces 'Game not found' as the error string.
    const heading = await screen.findByRole('heading', { name: /game not found/i })
    expect(heading).toBeInTheDocument()
  })
})
