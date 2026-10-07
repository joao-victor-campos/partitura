import { denominator, type Clef, type NoteReadingQuestion, type Pitch, type ValueSymbol } from '@partitura/core';

// Builds tiny MEI documents for Verovio. Exercises never touch MusicXML (see ADR 0005).

const CLEF: Record<Clef, string> = {
  treble: '<clef shape="G" line="2"/>',
  bass: '<clef shape="F" line="4"/>',
};

function staffDef(n: number, clef: Clef): string {
  return `<staffDef n="${n}" lines="5">${CLEF[clef]}</staffDef>`;
}

function staff(n: number, content: string): string {
  return `<staff n="${n}"><layer n="1">${content}</layer></staff>`;
}

function measure(content: string, n = 1): string {
  return `<measure n="${n}" right="invis">${content}</measure>`;
}

function noteXml(p: Pitch, color?: string): string {
  const accid = p.alter === 1 ? ' accid="s"' : p.alter === -1 ? ' accid="f"' : '';
  const colour = color ? ` color="${color}"` : '';
  return `<note pname="${p.step.toLowerCase()}" oct="${p.octave}" dur="1"${accid}${colour}/>`;
}

function meiDocument(staffGrp: string, measures: string): string {
  return '<?xml version="1.0" encoding="UTF-8"?>'
    + '<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0"><music><body><mdiv><score>'
    + `<scoreDef>${staffGrp}</scoreDef><section>${measures}</section>`
    + '</score></mdiv></body></music></mei>';
}

export function noteReadingMei(q: NoteReadingQuestion): string {
  if (q.layout === 'single') {
    return meiDocument(`<staffGrp>${staffDef(1, q.clef)}</staffGrp>`, measure(staff(1, noteXml(q.pitch))));
  }
  const upper = q.clef === 'treble' ? noteXml(q.pitch) : '<mSpace/>';
  const lower = q.clef === 'bass' ? noteXml(q.pitch) : '<mSpace/>';
  return meiDocument(
    `<staffGrp symbol="brace" bar.thru="true">${staffDef(1, 'treble')}${staffDef(2, 'bass')}</staffGrp>`,
    measure(staff(1, upper) + staff(2, lower)),
  );
}

/** A Note value on the middle line (Si4) of a treble staff. */
export function symbolMei(s: ValueSymbol): string {
  const dots = s.dotted ? ' dots="1"' : '';
  const dur = denominator(s.value);
  const body = s.rest ? `<rest dur="${dur}"${dots}/>` : `<note pname="b" oct="4" dur="${dur}"${dots}/>`;
  return meiDocument(`<staffGrp>${staffDef(1, 'treble')}</staffGrp>`, measure(staff(1, body)));
}

/** A row of coloured whole notes, one per measure: used to show weak notes. */
export function pitchesMei(clef: Clef, pitches: Pitch[], color: string): string {
  const measures = pitches.map((p, i) => measure(staff(1, noteXml(p, color)), i + 1)).join('');
  return meiDocument(`<staffGrp>${staffDef(1, clef)}</staffGrp>`, measures);
}
