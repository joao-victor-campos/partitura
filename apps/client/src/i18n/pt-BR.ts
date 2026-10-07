import type { Clef, NoteValue, NoteValueQuestionType, StaffChoice, Step } from '@partitura/core';

const pitch: Record<Step, string> = { C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si' };

const noteValue: Record<NoteValue, string> = {
  whole: 'semibreve', half: 'mínima', quarter: 'semínima', eighth: 'colcheia',
  sixteenth: 'semicolcheia', 'thirty-second': 'fusa', 'sixty-fourth': 'semifusa',
};

const noteValuePlural: Record<NoteValue, string> = {
  whole: 'semibreves', half: 'mínimas', quarter: 'semínimas', eighth: 'colcheias',
  sixteenth: 'semicolcheias', 'thirty-second': 'fusas', 'sixty-fourth': 'semifusas',
};

const clef: Record<Clef, string> = { treble: 'clave de Sol', bass: 'clave de Fá' };

const staveChoice: Record<StaffChoice, string> = {
  treble: 'Clave de Sol', bass: 'Clave de Fá', mixed: 'Sol e Fá misturadas', grand: 'Pauta dupla (piano)',
};

const typeChoice: Record<NoteValueQuestionType, string> = {
  'symbol-to-name': 'Figura → nome', 'name-to-symbol': 'Nome → figura', relation: 'Quantas cabem',
};

/** Every on-screen string. Components must not contain Portuguese literals. */
export const t = {
  pitch,
  noteValue,
  noteValuePlural,
  clef,
  sharp: '♯',
  flat: '♭',
  dotted: 'pontuada',
  restOf: 'pausa de',
  error: {
    title: 'Algo deu errado.',
    home: 'Voltar ao início',
  },
  home: {
    title: 'Treino',
    noteReading: 'Leitura de notas',
    noteReadingHint: 'Clave de Sol e clave de Fá',
    noteValue: 'Figuras musicais',
    noteValueHint: 'Semibreve, mínima, semínima…',
    progress: 'Ver progresso',
  },
  setup: {
    levels: 'Níveis',
    level: (n: number) => `Nível ${n}`,
    custom: 'Personalizado',
    answerMode: 'Responder com',
    byName: 'Nome da nota',
    byPiano: 'Teclado',
    speed: (seconds: number) => `Modo velocidade (${seconds} segundos)`,
    start: 'Começar',
    back: 'Voltar',
    staves: 'Pauta',
    staveChoice,
    ledgerLines: 'Linhas suplementares',
    accidentals: 'Sustenidos e bemóis',
    accidentalsHint: '(só ao responder com o teclado)',
    values: 'Figuras',
    types: 'Perguntas',
    typeChoice,
    rests: 'Incluir pausas',
    dottedValues: 'Incluir figuras pontuadas',
    invalid: 'Escolha pelo menos uma figura e um tipo de pergunta que funcionem juntos.',
  },
  round: {
    progress: (n: number, total: number) => `${n} de ${total}`,
    secondsLeft: (s: number) => `${s} s`,
    whichNote: 'Qual é esta nota?',
    whichValue: 'Qual é esta figura?',
    findValue: (name: string) => `Onde está a ${name}?`,
    relation: (part: string, whole: string) => `Quantas ${part} cabem em uma ${whole}?`,
    correct: 'Certo!',
    wrongWas: (answer: string) => `Era ${answer}`,
    wrongOctave: (answer: string) => `Era ${answer}, em outra oitava`,
    next: 'Próxima',
    quit: 'Sair',
    middleC: 'Dó central',
    piano: 'Teclado',
  },
  summary: {
    title: 'Fim da rodada',
    score: (correct: number, answered: number) => `${correct} de ${answered}`,
    average: (seconds: string) => `${seconds} s por resposta`,
    again: 'De novo',
    back: 'Voltar',
  },
  progress: {
    title: (exercise: string) => `Progresso: ${exercise}`,
    weak: 'Para reforçar',
    noWeak: 'Nada para reforçar ainda. Faça algumas rodadas!',
    suggestion: (percent: number, n: number) => `Você passou de ${percent}% nas últimas rodadas. Experimente o Nível ${n}.`,
    recent: 'Últimas rodadas',
    noRounds: 'Nenhuma rodada ainda.',
    when: 'Quando',
    level: 'Nível',
    score: 'Acertos',
    back: 'Voltar',
  },
};
