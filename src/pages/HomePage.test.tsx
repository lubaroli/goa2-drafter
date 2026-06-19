import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('renders the title', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /drafter/i, level: 1 })).toBeInTheDocument()
    // Banner / brand text — appears in the header eyebrow and the footer; both are fine.
    expect(screen.getAllByText(/guards of atlantis ii/i).length).toBeGreaterThan(0)
  })

  it('navigates to /setup when "Create a new game" is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/setup" element={<div>setup-marker</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /create a new game/i }))
    expect(await screen.findByText('setup-marker')).toBeInTheDocument()
  })
})
