import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeOptions {
  onload: () => void;
  onerror: (error: Error) => void;
}

const mocks = vi.hoisted(() => ({
  outcomes: [] as ('error' | 'load')[],
  samplers: [] as { dispose: ReturnType<typeof vi.fn>; triggerAttackRelease: ReturnType<typeof vi.fn> }[],
}));

vi.mock('tone', () => {
  class Sampler {
    dispose = vi.fn();
    triggerAttackRelease = vi.fn();
    constructor(options: FakeOptions) {
      mocks.samplers.push(this);
      const outcome = mocks.outcomes.shift() ?? 'load';
      queueMicrotask(() => (outcome === 'error' ? options.onerror(new Error('boom')) : options.onload()));
    }
    toDestination() {
      return this;
    }
  }
  return {
    start: vi.fn(async () => {}),
    Sampler,
    Frequency: (midi: number) => ({ toNote: () => `note${midi}` }),
  };
});

describe('piano', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.outcomes.length = 0;
    mocks.samplers.length = 0;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries after a failed load instead of caching the rejection', async () => {
    mocks.outcomes.push('error', 'load');
    const { loadPiano } = await import('./piano');

    await expect(loadPiano()).rejects.toThrow('boom');
    expect(mocks.samplers[0].dispose).toHaveBeenCalled();

    const piano = await loadPiano();
    expect(piano).toBe(mocks.samplers[1]);
    expect(mocks.samplers).toHaveLength(2);
  });

  it('reuses the loaded sampler', async () => {
    const { loadPiano } = await import('./piano');
    const a = await loadPiano();
    const b = await loadPiano();
    expect(a).toBe(b);
    expect(mocks.samplers).toHaveLength(1);
  });

  it('playMidi plays the note when loading works', async () => {
    const { playMidi } = await import('./piano');
    await playMidi(60, 2);
    expect(mocks.samplers[0].triggerAttackRelease).toHaveBeenCalledWith('note60', 2);
  });

  it('playMidi never throws when loading fails, it only warns', async () => {
    mocks.outcomes.push('error');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { playMidi } = await import('./piano');

    await expect(playMidi(60)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('Piano unavailable', expect.any(Error));
  });
});
