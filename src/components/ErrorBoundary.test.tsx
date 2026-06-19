import { describe, expect, it, vi } from 'vitest'
import type { JSX } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): JSX.Element {
  throw new Error('boom!')
}

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>safe child</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('safe child')).toBeInTheDocument()
  })

  it('renders the fallback when a child throws', () => {
    // React logs caught errors to console.error; suppress to keep test output clean.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      )

      expect(
        screen.getByRole('heading', { name: /something went wrong/i, level: 1 }),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('reload button calls location.reload()', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const reloadSpy = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    })
    try {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      )
      await userEvent.click(screen.getByRole('button', { name: /reload/i }))
      expect(reloadSpy).toHaveBeenCalledTimes(1)
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      })
      consoleSpy.mockRestore()
    }
  })
})
