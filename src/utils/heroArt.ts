/**
 * Hero artwork helpers — pure, deterministic utilities used by the
 * domino selection components.
 */

/** Returns the public URL for a hero portrait. */
export function heroImageUrl(imageId: string): string {
  return `${import.meta.env.BASE_URL}heroes/${imageId}.png`
}

/**
 * Deterministic FNV-1a-ish 32-bit hash of a string. Pure helper used by
 * `heroPlaceholderStyle` so the same id always produces the same colours.
 */
function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Returns an inline `style` object with a deterministic dark linear-gradient
 * derived from the hero id. Used as a fallback when the portrait image is
 * unavailable.
 */
export function heroPlaceholderStyle(heroId: string): { background: string } {
  const hash = hashString(heroId)
  const hue1 = hash % 360
  const hue2 = (hash >>> 8) % 360
  const background = `linear-gradient(135deg, hsl(${hue1}, 55%, 28%) 0%, hsl(${hue2}, 60%, 14%) 100%)`
  return { background }
}

/** Uppercase first letter of the first word of a hero name. */
export function heroMonogram(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) return ''
  const firstWord = trimmed.split(/\s+/)[0] ?? ''
  return firstWord.charAt(0).toUpperCase()
}
