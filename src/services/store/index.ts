import type { GameStore } from '@/types'
import { isSupabaseConfigured } from '@/services/supabase'
import { LocalGameStore } from './LocalGameStore'
import { SupabaseGameStore } from './SupabaseGameStore'

/**
 * Choose the backing store based on env configuration. When Supabase env vars
 * are present we hit the hosted backend; otherwise fall back to an in-memory
 * local store (useful for offline play and tests).
 */
export function getGameStore(): GameStore {
  if (isSupabaseConfigured()) return new SupabaseGameStore()
  return new LocalGameStore()
}

export const gameStore = getGameStore()
