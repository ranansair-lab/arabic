export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[], rng: Rng = defaultRng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle, but never return the original order when it can be avoided. */
export function shuffleChanged<T>(items: readonly T[], rng: Rng = defaultRng): T[] {
  if (items.length < 2) return items.slice();
  for (let attempt = 0; attempt < 8; attempt++) {
    const s = shuffle(items, rng);
    if (s.some((v, i) => v !== items[i])) return s;
  }
  return [...items.slice(1), items[0]];
}

/** Deterministic RNG for tests. */
export function seededRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
