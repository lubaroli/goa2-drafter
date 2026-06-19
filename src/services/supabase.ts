import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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
 */
export function isSupabaseConfigured(): boolean {
  const { url, key } = readEnv()
  return url !== undefined && key !== undefined
}

let cached: SupabaseClient | null = null

/**
 * Lazily create and memoise a single Supabase client for the app's lifetime.
 * Throws a clear error when the env vars are missing — callers should gate
 * with `isSupabaseConfigured()` first.
 */
export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached
  const { url, key } = readEnv()
  if (url === undefined || key === undefined) {
    throw new Error(
      'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
    )
  }
  cached = createClient(url, key)
  return cached
}
