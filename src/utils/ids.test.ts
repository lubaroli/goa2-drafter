import { describe, it, expect } from 'vitest'
import { generateGameCode, generateToken } from './ids'

// The "safe" alphabet must exclude 0, O, 1, I, l.
// We verify any returned character is NOT one of the ambiguous ones,
// and is from a lowercase+digit set.
const FORBIDDEN = new Set(['0', 'O', '1', 'I', 'l'])
const SAFE_PATTERN = /^[a-z0-9]+$/

describe('generateGameCode', () => {
  it('returns a string of length 6', () => {
    const code = generateGameCode()
    expect(code).toHaveLength(6)
  })

  it('contains only characters from a safe lowercase+digit alphabet (no 0/O/1/I/l)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateGameCode()
      expect(code).toMatch(SAFE_PATTERN)
      for (const ch of code) {
        expect(FORBIDDEN.has(ch)).toBe(false)
      }
    }
  })

  it('is deterministic with a stubbed rng returning 0 (all chars equal first-of-alphabet)', () => {
    const code = generateGameCode(() => 0)
    expect(code).toHaveLength(6)
    // With rng()=0, every index picks alphabet[0], so all 6 chars must be identical
    expect(new Set(code).size).toBe(1)
    // And the chosen char must still be from the safe alphabet
    expect(code).toMatch(SAFE_PATTERN)
    for (const ch of code) {
      expect(FORBIDDEN.has(ch)).toBe(false)
    }
  })

  it('is deterministic with a stubbed rng returning ~0.9999 (all chars equal last-of-alphabet)', () => {
    const code = generateGameCode(() => 0.9999999)
    expect(code).toHaveLength(6)
    expect(new Set(code).size).toBe(1)
    expect(code).toMatch(SAFE_PATTERN)
  })

  it('produces mostly unique codes across 1000 calls', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      codes.add(generateGameCode())
    }
    // With ~32^6 ≈ 1B possibilities, collisions in 1000 should be vanishingly rare.
    // Allow a generous margin to avoid CI flakes.
    expect(codes.size).toBeGreaterThanOrEqual(995)
  })
})

describe('generateToken', () => {
  it('returns a non-empty string', () => {
    const token = generateToken()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('two consecutive calls return different tokens', () => {
    const a = generateToken()
    const b = generateToken()
    expect(a).not.toBe(b)
  })

  it('returns either a valid UUID v4 or a string of length >= 21', () => {
    const token = generateToken()
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isUuid = UUID_RE.test(token)
    expect(isUuid || token.length >= 21).toBe(true)
  })

  it('produces mostly unique tokens across 1000 calls', () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      tokens.add(generateToken())
    }
    expect(tokens.size).toBe(1000)
  })

  it('falls back to crypto.getRandomValues when crypto.randomUUID is unavailable', () => {
    // Remove only randomUUID; getRandomValues remains as the CSPRNG.
    const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } }
    const originalCrypto = g.crypto
    const originalRandomUUID = originalCrypto?.randomUUID

    try {
      if (originalCrypto && 'randomUUID' in originalCrypto) {
        delete (originalCrypto as { randomUUID?: () => string }).randomUUID
      }
      const token = generateToken()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThanOrEqual(21)
      // URL-safe charset: alphanumerics plus - and _
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    } finally {
      if (originalCrypto && originalRandomUUID) {
        ;(originalCrypto as { randomUUID?: () => string }).randomUUID = originalRandomUUID
      }
    }
  })

  it('throws when no CSPRNG is available (no randomUUID and no getRandomValues)', () => {
    const g = globalThis as unknown as { crypto?: unknown }
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    try {
      // Replace crypto with an empty object — no randomUUID, no getRandomValues.
      Object.defineProperty(globalThis, 'crypto', {
        value: {},
        configurable: true,
        writable: true,
      })
      expect(() => generateToken()).toThrow(/no secure random source available/i)
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'crypto', descriptor)
      } else {
        delete g.crypto
      }
    }
  })

  it('throws when crypto itself is undefined', () => {
    const g = globalThis as unknown as { crypto?: unknown }
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        configurable: true,
        writable: true,
      })
      expect(() => generateToken()).toThrow(/no secure random source available/i)
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'crypto', descriptor)
      } else {
        delete g.crypto
      }
    }
  })
})
