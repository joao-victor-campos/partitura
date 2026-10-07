// @vitest-environment node
/// <reference types="node" />
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SAMPLE_NOTES, sampleFile } from './sampleNotes';

describe('offline piano bundle', () => {
  it('has a committed mp3 for every sample note', () => {
    const dir = fileURLToPath(new URL('../../public/samples/piano/', import.meta.url));
    const missing = SAMPLE_NOTES.map(sampleFile).filter((file) => !existsSync(dir + file));
    expect(missing).toEqual([]);
    expect(existsSync(dir + 'ATTRIBUTION.txt')).toBe(true);
  });
});
