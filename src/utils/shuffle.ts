/**
 * Returns a new array with the elements of `array` in a uniformly random order
 * (Fisher–Yates shuffle). Does not mutate the input.
 *
 * @param array Source array. Not mutated.
 * @param rng Optional RNG returning a value in [0, 1). Defaults to Math.random.
 */
export function shuffleArray<T>(array: readonly T[], rng: () => number = Math.random): T[] {
  const result = array.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return result
}
