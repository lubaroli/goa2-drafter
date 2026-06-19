import { describe, it, expect } from 'vitest'
import { shuffleArray } from './shuffle'

describe('shuffleArray', () => {
  it('returns an array of the same length', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffleArray(input)
    expect(result).toHaveLength(input.length)
  })

  it('contains all the original elements (multiset equality)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const result = shuffleArray(input)
    expect([...result].sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b))
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5]
    const snapshot = [...input]
    shuffleArray(input)
    expect(input).toEqual(snapshot)
  })

  it('returns a new array (different reference from input)', () => {
    const input = [1, 2, 3]
    const result = shuffleArray(input)
    expect(result).not.toBe(input)
  })

  it('produces a deterministic order with a stubbed rng (Fisher-Yates with rng=0.5)', () => {
    // Fisher-Yates iterates i = n-1 down to 1, j = floor(rng() * (i+1)), swap a[i],a[j]
    // With input ['a','b','c','d'] and rng() always returning 0.5:
    //   i=3, j=floor(0.5*4)=2: swap a[3],a[2] -> ['a','b','d','c']
    //   i=2, j=floor(0.5*3)=1: swap a[2],a[1] -> ['a','d','b','c']
    //   i=1, j=floor(0.5*2)=1: swap a[1],a[1] -> ['a','d','b','c']
    const rng = () => 0.5
    const result = shuffleArray(['a', 'b', 'c', 'd'], rng)
    expect(result).toEqual(['a', 'd', 'b', 'c'])
  })

  it('produces identity-like result with rng() returning ~0.999 (j always == i, no swaps)', () => {
    const rng = () => 0.9999999
    const input = [1, 2, 3, 4, 5]
    const result = shuffleArray(input, rng)
    expect(result).toEqual([1, 2, 3, 4, 5])
  })

  it('rotates with rng() returning 0 (j=0 every iteration) on [1,2,3,4]', () => {
    // i=3, j=0: [4,2,3,1]
    // i=2, j=0: [3,2,4,1]
    // i=1, j=0: [2,3,4,1]
    const rng = () => 0
    const result = shuffleArray([1, 2, 3, 4], rng)
    expect(result).toEqual([2, 3, 4, 1])
  })

  it('handles an empty array', () => {
    expect(shuffleArray([])).toEqual([])
  })

  it('handles a single-element array', () => {
    expect(shuffleArray([42])).toEqual([42])
  })
})
