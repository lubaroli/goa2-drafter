import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Read the Supabase URL/anon key from Vite env vars. Returns `undefined` for
 * missing or empty values so callers can branch on configuration cleanly.
 */
const readEnv = (): { url?: string; key?: string } => {
  const env = import.meta.env
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  return {
    url: url && url.length > 0 ? url : undefined,
    key: key && key.length > 0 ? key : undefined,
  }
}

/**
 * True when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set to
 * non-empty strings. Used by the store factory to choose Supabase vs the
 * local fallback.
 *
 * IMPORTANT: this module deliberately does NOT statically import
 * `@supabase/supabase-js`. The supabase client is heavy (~140kB gzipped) and
 * is only needed when the env vars are configured; we want it to land in a
 * separate async chunk rather than the main bundle. See
 * `createSupabaseClient` for the dynamic import boundary.
 */
export function isSupabaseConfigured(): boolean {
  const { url, key } = readEnv()
  return url !== undefined && key !== undefined
}

let cached: SupabaseClient | null = null
let pending: Promise<SupabaseClient> | null = null

/**
 * Lazily import `@supabase/supabase-js` and create a memoised client. The
 * dynamic import is what lets Vite emit supabase as a separate async chunk;
 * keeping this async (vs the previous sync `getSupabaseClient`) is the whole
 * point of the split. Throws when env vars are missing — callers should gate
 * with `isSupabaseConfigured()` first.
 */
export async function createSupabaseClient(): Promise<SupabaseClient> {
  if (cached) return cached
  if (pending) return pending
  const { url, key } = readEnv()
  if (url === undefined || key === undefined) {
    throw new Error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  }
  pending = import('@supabase/supabase-js').then(({ createClient }) => {
    cached = createClient(url, key)
    pending = null
    return cached
  })
  return pending
}
