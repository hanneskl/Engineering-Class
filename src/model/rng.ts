/**
 * Deterministic per-student randomness.
 *
 * The seed comes from the student's name, so every student gets a different
 * set of numbers but the same student always gets the same set — they can
 * close the tab and come back to the identical exercise.
 */

/** FNV-1a. Small, fast, good enough to spread names across the seed space. */
export function seedFromName(name: string): number {
  let h = 0x811c9dc5
  const normalized = name.trim().toLowerCase()
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 — tiny seeded PRNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Integer in [min, max], inclusive. */
export function intBetween(next: () => number, min: number, max: number): number {
  return min + Math.floor(next() * (max - min + 1))
}

/** Draws `count` distinct integers from [min, max]. */
export function distinctInts(
  next: () => number,
  count: number,
  min: number,
  max: number,
): number[] {
  const seen = new Set<number>()
  // Bounded so a too-narrow range can never spin forever.
  for (let guard = 0; guard < 1000 && seen.size < count; guard++) {
    seen.add(intBetween(next, min, max))
  }
  return [...seen]
}

/** Fisher-Yates, seeded. */
export function shuffle<T>(next: () => number, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    const a = out[i]!
    const b = out[j]!
    out[i] = b
    out[j] = a
  }
  return out
}
