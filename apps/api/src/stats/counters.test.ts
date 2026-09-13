import { describe, expect, it, vi } from 'vitest';
import { pino } from 'pino';
import { createCounters, memoryPersistence, type CounterPersistence } from './counters.js';

const quiet = pino({ enabled: false });

describe('counters', () => {
  it('loads what the store holds', async () => {
    const counters = createCounters(memoryPersistence({ breaks: 7 }), quiet);
    expect(counters.get('breaks')).toBe(0);

    await counters.load();
    expect(counters.get('breaks')).toBe(7);
  });

  it('bumps at once, then adopts the stored value', async () => {
    let resolveStored!: (value: number) => void;
    const persistence: CounterPersistence = {
      load: () => Promise.resolve({}),
      increment: () => new Promise<number>((resolve) => (resolveStored = resolve)),
    };
    const counters = createCounters(persistence, quiet);

    counters.increment('breaks');
    expect(counters.get('breaks')).toBe(1);

    // The store knew about breaks this process never saw.
    resolveStored(10);
    await vi.waitFor(() => expect(counters.get('breaks')).toBe(10));
  });

  it('keeps counting when the store refuses the write', async () => {
    const persistence: CounterPersistence = {
      load: () => Promise.resolve({}),
      increment: () => Promise.reject(new Error('db down')),
    };
    const counters = createCounters(persistence, quiet);

    expect(() => counters.increment('breaks')).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(counters.get('breaks')).toBe(1);
  });

  it('starts from zero when the store cannot be read', async () => {
    const persistence: CounterPersistence = {
      load: () => Promise.reject(new Error('db down')),
      increment: () => Promise.resolve(1),
    };
    const counters = createCounters(persistence, quiet);

    await expect(counters.load()).resolves.toBeUndefined();
    expect(counters.get('breaks')).toBe(0);
  });
});
