import { logger, type Logger } from '../logger.js';

export type CounterKey = 'breaks';

/**
 * Global tallies with an in-memory cache in front of whatever stores them.
 * Reads are synchronous so `/api/stats` never waits on the database; writes
 * go through optimistically and adopt the stored value once it lands.
 */
export interface Counters {
  get(key: CounterKey): number;
  /** Fire-and-forget write-through. Never throws; failures are logged. */
  increment(key: CounterKey): void;
  /** Warms the cache from storage. Failure is logged, not thrown. */
  load(): Promise<void>;
}

export interface CounterPersistence {
  load(): Promise<Partial<Record<CounterKey, number>>>;
  /** Atomic +1; resolves with the new stored value. */
  increment(key: CounterKey): Promise<number>;
}

export function createCounters(persistence: CounterPersistence, log: Logger = logger): Counters {
  const cache: Record<CounterKey, number> = { breaks: 0 };

  return {
    get: (key) => cache[key],

    increment(key) {
      cache[key] += 1;
      void persistence
        .increment(key)
        .then((stored) => {
          // The store is the truth: this also heals a cache that started from
          // zero because `load()` failed at boot.
          cache[key] = stored;
        })
        .catch((err: unknown) => log.error({ err, key }, 'Counter increment not persisted'));
    },

    async load() {
      try {
        const stored = await persistence.load();
        for (const key of Object.keys(cache) as CounterKey[]) {
          cache[key] = stored[key] ?? 0;
        }
      } catch (err) {
        log.warn({ err }, 'Counters not loaded; counting from zero until the next write');
      }
    },
  };
}

/** Keeps the numbers in the process only. For tests and databaseless runs. */
export function memoryPersistence(
  initial: Partial<Record<CounterKey, number>> = {},
): CounterPersistence {
  const values: Partial<Record<CounterKey, number>> = { ...initial };
  return {
    load: () => Promise.resolve({ ...values }),
    increment(key) {
      values[key] = (values[key] ?? 0) + 1;
      return Promise.resolve(values[key]);
    },
  };
}
