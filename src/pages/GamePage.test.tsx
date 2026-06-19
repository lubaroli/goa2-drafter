import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GamePage } from './GamePage'
import { gameStore } from '@/services/store'
import type { CreateGameInput, GameStore, Player } from '@/types'
import { buildSnakeDraftOrder } from '@/services/draft'

const clearStorage = (): void => {
  const ls = (globalThis as { localStorage?: Storage }).localStorage
  if (ls) ls.clear()
}

/** Detach any in-tab subscriptions left on the shared singleton store. */
const clearStoreSubscriptions = (): void => {
  const s = gameStore as { clearSubscriptions?: () => void }
  s.clearSubscriptions?.()
}

type CreatedGameResult = Awaited<ReturnType<GameStore['createGame']>>

// A small fixed hero pool from the real data set.
const POOL = [
  'arien-the-tidemaster',
  'brogan-the-destroyer',
  'tigerclaw-the-cutpurse',
  'wasp-the-warmaiden',
  'sabina-the-gunslinger',
  'xargatha-the-changed',
]

async function createSnakeGame(): Promise<CreatedGameResult> {
  const input: CreateGameInput = {
    playerCount: 4,
    method: 'snake',
    heroPool: POOL,
    players: [
      { name: 'Alice', team: 'red', seat: 0 },
      { name: 'Bob', team: 'blue', seat: 1 },
      { name: 'Cara', team: 'blue', seat: 2 },
      { name: 'Dan', team: 'red', seat: 3 },
    ],
  }
  return gameStore.createGame(input)
}

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play/:gameId" element={<GamePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GamePage', () => {
  beforeEach(() => {
    clearStoreSubscriptions()
    clearStorage()
  })
  afterEach(() => {
    cleanup()
    clearStoreSubscriptions()
  })

  it('renders the read-only board (no selector) when no token is present', async () => {
    const created = await createSnakeGame()
    renderAt(`/play/${created.game.id}`)

    // Both team rosters render (Alice appears at least once — she's also the
    // first picker so may also show in the on-the-clock banner).
    expect((await screen.findAllByText('Alice')).length).toBeGreaterThan(0)
    expect(screen.getByText('Bob')).toBeInTheDocument()
    // On-the-clock banner names the first picker.
    expect(screen.getByTestId('on-the-clock-banner')).toBeInTheDocument()
    // No hero selector without a token.
    expect(screen.queryByLabelText('hero selector')).not.toBeInTheDocument()
  })

  it('shows the hero selector when a valid token is present and the game is drafting', async () => {
    const created = await createSnakeGame()
    const someToken = created.players[0]!.token
    renderAt(`/play/${created.game.id}?t=${someToken}`)

    await screen.findAllByText('Alice')
    expect(screen.getByLabelText('hero selector')).toBeInTheDocument()
  })

  it("surfaces 'not your turn' when the wrong player tries to pick", async () => {
    const created = await createSnakeGame()
    // Determine the FIRST picker, then use a DIFFERENT player's token.
    const order = buildSnakeDraftOrder(created.players)
    const firstPickerId = order[0]
    const wrongPlayer = created.players.find((p: Player) => p.id !== firstPickerId)!
    renderAt(`/play/${created.game.id}?t=${wrongPlayer.token}`)

    const user = userEvent.setup()
    // Open a domino and attempt a pick.
    const firstDomino = await screen.findByRole('button', { name: /arien the tidemaster/i })
    await user.click(firstDomino)
    const pickButton = await screen.findByRole('button', { name: /pick this hero/i })
    await user.click(pickButton)

    expect(await screen.findByText(/not your turn/i)).toBeInTheDocument()
  })

  it('lets the current picker pick, advancing the board live', async () => {
    const created = await createSnakeGame()
    const order = buildSnakeDraftOrder(created.players)
    const firstPicker = created.players.find((p: Player) => p.id === order[0])!
    renderAt(`/play/${created.game.id}?t=${firstPicker.token}`)

    const user = userEvent.setup()
    const domino = await screen.findByRole('button', { name: /arien the tidemaster/i })
    await user.click(domino)
    const pickButton = await screen.findByRole('button', { name: /pick this hero/i })
    await user.click(pickButton)

    // Success flash, and the pick progress advances.
    expect(await screen.findByText(/picked arien the tidemaster/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('pick-progress')).toHaveTextContent(/pick 1 of 4/i)
    })
  })

  it('shows a not-found message for an unknown game id', async () => {
    renderAt('/play/does-not-exist')
    expect(
      await screen.findByRole('heading', { name: /game not found/i }),
    ).toBeInTheDocument()
  })
})
