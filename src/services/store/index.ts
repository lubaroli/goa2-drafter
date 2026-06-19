import type { GameStore } from '@/types'
import { isSupabaseConfigured } from '@/services/supabase'
import { LocalGameStore } from './LocalGameStore'
import { LazySupabaseGameStore } from './LazySupabaseGameStore'

/**
 * Choose the backing store based on env configuration. When Supabase env vars
 * are present we hit the hosted backend; otherwise fall back to an in-memory
 * local store (useful for offline play and tests).
 *
 * NOTE: when Supabase is configured, we return a `LazySupabaseGameStore`
 * proxy rather than the real implementation. This keeps `@supabase/supabase-js`
 * (~140kB gzipped) out of the main bundle — it loads on demand the first time
 * a store method is called. See `LazySupabaseGameStore.ts` for details.
 */
export function getGameStore(): GameStore {
  if (isSupabaseConfigured()) return new LazySupabaseGameStore()
  return new LocalGameStore()
}

export const gameStore = getGameStore()
