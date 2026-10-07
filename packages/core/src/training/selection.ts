import { pickWeighted, type Rng } from '../random';
import type { Attempt } from './attempt';

export interface ItemStats {
  n: number;
  wrong: number;
  medianMs: number;
}

export const STATS_WINDOW = 10;
export const SLOW_MS = 3000;

/** Stats per itemKey over its most recent attempts. Expects attempts oldest first. */
export function itemStats(attempts: readonly Attempt[]): Map<string, ItemStats> {
  const byKey = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const list = byKey.get(a.itemKey) ?? [];
    list.push(a);
    byKey.set(a.itemKey, list);
  }
  const stats = new Map<string, ItemStats>();
  for (const [key, list] of byKey) {
    const recent = list.slice(-STATS_WINDOW);
    const times = recent.map((a) => a.ms).sort((x, y) => x - y);
    stats.set(key, {
      n: recent.length,
      wrong: recent.filter((a) => !a.correct).length,
      medianMs: times[Math.floor(times.length / 2)],
    });
  }
  return stats;
}

/** Unseen items get a coverage bonus; missed and slow items come up more often. */
export function itemWeight(stats: ItemStats | undefined): number {
  if (!stats) return 2;
  return 1 + 4 * (stats.wrong / stats.n) + (stats.medianMs > SLOW_MS ? 1 : 0);
}

export function pickItem<T extends { itemKey: string }>(
  pool: readonly T[],
  history: readonly Attempt[],
  previousKey: string | null,
  rng: Rng,
): T {
  const candidates = pool.length > 1 ? pool.filter((item) => item.itemKey !== previousKey) : pool;
  const stats = itemStats(history);
  return pickWeighted(candidates, candidates.map((item) => itemWeight(stats.get(item.itemKey))), rng);
}
