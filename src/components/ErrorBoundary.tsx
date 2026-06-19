import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Top-level error boundary. Catches render-time errors from any child route
 * and renders a friendly fallback card with a Reload button. In dev (when
 * `import.meta.env.DEV` is true) the error message is also displayed to make
 * triage easier; in production we keep the UI clean.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error, info)
    }
  }

  handleReload = (): void => {
    location.reload()
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children

    return (
      <div
        role="alert"
        className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100"
      >
        <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900/80 p-6 shadow-lg">
          <h1 className="mb-2 text-2xl font-bold text-amber-300">Something went wrong</h1>
          <p className="mb-4 text-sm text-slate-300">
            The app hit an unexpected error. Reloading usually clears it up.
          </p>
          {import.meta.env.DEV ? (
            <pre className="mb-4 max-h-48 overflow-auto rounded-md border border-slate-700 bg-slate-950/80 p-3 text-xs text-red-200">
              {error.message}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-slate-50 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
