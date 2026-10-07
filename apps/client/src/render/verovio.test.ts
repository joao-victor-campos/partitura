// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { noteReadingMei } from './mei';
import { renderMei } from './verovio';

describe('renderMei', () => {
  it('renders generated MEI to SVG', async () => {
    const svg = await renderMei(noteReadingMei({
      kind: 'note-reading', itemKey: 'nr:treble:D5', clef: 'treble', layout: 'grand',
      pitch: { step: 'D', octave: 5, alter: 0 }, answerMode: 'name',
    }));
    expect(svg).toContain('<svg');
    expect(svg).toContain('class="note"');
  }, 20_000);
});
