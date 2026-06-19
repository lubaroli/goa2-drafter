// Unambiguous lowercase+digit alphabet for human-friendly game codes.
// Excludes 0, O, 1, I, l, and also o/i to remove any visual ambiguity.
// 32 characters total.
const GAME_CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'
const GAME_CODE_LENGTH = 6

// URL-safe charset for tokens built via crypto.getRandomValues (RFC 4648 base64url chars).
const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const TOKEN_LENGTH = 24

/**
 * Generate a short, human-friendly, URL-safe game code.
 * 6 characters drawn from an unambiguous alphabet (no 0, O, 1, I, l).
 *
 * @param rng Optional RNG returning a value in [0, 1). Defaults to Math.random.
 */
export function generateGameCode(rng: () => number = Math.random): string {
  let out = ''
  for (let i = 0; i < GAME_CODE_LENGTH; i++) {
    const idx = Math.floor(rng() * GAME_CODE_ALPHABET.length)
    out += GAME_CODE_ALPHABET.charAt(idx)
  }
  return out
}

interface CryptoLike {
  randomUUID?: () => string
  getRandomValues?: <T extends ArrayBufferView>(array: T) => T
}

/**
 * Generate an unguessable token. Uses a CSPRNG and FAILS CLOSED if no secure
 * source is available — does not silently fall back to Math.random.
 *
 * Order of preference:
 *   1. `crypto.randomUUID()` (returns a v4 UUID, length 36)
 *   2. `crypto.getRandomValues()` to build a URL-safe random string (length 24)
 *
 * @throws Error if no CSPRNG is available.
 */
export function generateToken(): string {
  const c = (globalThis as { crypto?: CryptoLike }).crypto
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  if (c && typeof c.getRandomValues === 'function') {
    return randomUrlSafeString(TOKEN_LENGTH, c)
  }
  throw new Error('no secure random source available')
}

function randomUrlSafeString(length: number, c: CryptoLike): string {
  // Caller guarantees c.getRandomValues exists.
  const getRandomValues = c.getRandomValues as <T extends ArrayBufferView>(array: T) => T
  const buf = new Uint8Array(length)
  getRandomValues(buf)
  let out = ''
  for (let i = 0; i < length; i++) {
    const byte = buf[i] as number
    out += TOKEN_ALPHABET.charAt(byte % TOKEN_ALPHABET.length)
  }
  return out
}
