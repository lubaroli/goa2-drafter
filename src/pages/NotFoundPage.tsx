import type { JSX } from 'react'
import { Link } from 'react-router-dom'

/**
 * Catch-all 404 page. Rendered for any unmatched route. Provides a friendly
 * message and a link back to the home page.
 */
export function NotFoundPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900/80 p-6 text-center shadow-lg">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
          404
        </p>
        <h1 className="mb-3 text-3xl font-bold text-teal-300">Page not found</h1>
        <p className="mb-6 text-sm text-slate-300">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          to="/"
          className="inline-block rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-slate-50 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}
