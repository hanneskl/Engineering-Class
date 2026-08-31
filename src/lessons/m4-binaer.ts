import type { QuizLesson, Task } from '../model/types'
import { checkKeywords, checkToBinary, checkToDecimal, toBinary } from '../model/check'
import { distinctInts, rng } from '../model/rng'

/**
 * M4 — Binärzahlen.
 *
 * Method and wording follow the "Informatik 9 Netzwerke" deck: a Stellenwert
 * table read right to left, where Stelle 1 has the value 1. Hints deliberately
 * teach *that* method rather than a different one, so a stuck student sees the
 * same table they saw in class.
 */

const POWERS = [1, 2, 4, 8, 16, 32, 64, 128]

/** The set bits of n, largest first: 29 -> [16, 8, 4, 1]. */
export function decompose(n: number): number[] {
  const used: number[] = []
  let rest = n
  for (let i = POWERS.length - 1; i >= 0; i--) {
    const p = POWERS[i]!
    if (p <= rest) {
      used.push(p)
      rest -= p
    }
  }
  return used
}

function sumLine(n: number): string {
  return decompose(n).join(' + ')
}

function toBinaryTask(id: string, value: number): Task {
  return {
    id,
    kind: 'numeric',
    prompt: `Rechne die Dezimalzahl ${value} in eine Binärzahl um.`,
    note: 'Nur Nullen und Einsen, ohne Leerzeichen.',
    answer: toBinary(value),
    helper: { type: 'stellenwert', value, direction: 'toBinary' },
    hints: {
      stups: `Welche Zweierpotenzen passen in ${value}? Fang mit der größten an, die noch hineinpasst.`,
      hinweis:
        'Geh die Stellenwert-Tabelle von oben nach unten durch: passt der Wert in den Rest, ' +
        'setzt du eine 1 und ziehst ihn ab — sonst eine 0. Am Ende liest du die Spalte ' +
        '"Gesetzt" von unten nach oben.',
      loesung: `${value} = ${sumLine(value)}, also ${toBinary(value)}.`,
    },
    check: (raw) => checkToBinary(raw, value),
  }
}

function toDecimalTask(id: string, value: number): Task {
  const bits = toBinary(value)
  return {
    id,
    kind: 'numeric',
    prompt: `Rechne die Binärzahl ${bits} in eine Dezimalzahl um.`,
    answer: String(value),
    helper: { type: 'stellenwert', value, direction: 'toDecimal' },
    hints: {
      stups: 'Fang ganz rechts an. Die letzte Stelle hat den Wert 1, dann 2, dann 4, dann 8 …',
      hinweis:
        'Schreib über jede Stelle ihren Wert (von rechts: 1, 2, 4, 8, 16, 32, 64). ' +
        'Dann addierst du nur die Werte, über denen eine 1 steht.',
      loesung: `${bits} = ${sumLine(value)} = ${value}.`,
    },
    check: (raw) => checkToDecimal(raw, bits),
  }
}

export const m4Binaer: QuizLesson = {
  kind: 'quiz',
  id: 'm4',
  module: 'M4',
  title: 'Binärzahlen',
  quali:
    'In jeder Quali seit 2019 wurde in beide Richtungen gerechnet. 2026 waren das ' +
    '6 von 30 Punkten im Theorieteil — plus 2 Punkte für die Frage, warum Computer ' +
    'überhaupt binär rechnen.',
  intro: {
    heading: 'Warum nur Nullen und Einsen?',
    body: [
      'Ein Computer wird durch elektrische Signale gesteuert. Ein Signal kann nur zwei ' +
        'Zustände haben: Strom an oder Strom aus. Genau dafür stehen die 1 und die 0.',
      'Um trotzdem jede Zahl darstellen zu können, bekommt jede Stelle einen festen Wert — ' +
        'und zwar von rechts nach links: 1, 2, 4, 8, 16, 32, 64, 128. Jeder Wert ist doppelt ' +
        'so groß wie der davor.',
      'Eine Binärzahl liest du, indem du die Werte aller Stellen zusammenzählst, an denen ' +
        'eine 1 steht. Beispiel: 1101 = 8 + 4 + 1 = 13. Achtung — die kleinste Stelle steht ' +
        'ganz rechts. Das ist der häufigste Fehler.',
    ],
  },
  buildTasks: (seed) => {
    const next = rng(seed ^ 0x4b1)
    // Ranges mirror the numbers actually used in the Quali (17-83).
    const toBin = [
      ...distinctInts(next, 2, 12, 31),
      ...distinctInts(next, 2, 33, 99),
    ]
    const toDec = [
      ...distinctInts(next, 2, 5, 31),
      ...distinctInts(next, 2, 33, 120),
    ]

    return [
      {
        id: 'm4-warum',
        kind: 'self',
        prompt: 'Warum arbeitet ein Computer mit dem Binärsystem?',
        note: 'Schreib deine Antwort auf und vergleiche sie danach mit der Musterlösung.',
        answer:
          'Ein Computer wird durch elektrische Signale gesteuert. Diese können nur zwei ' +
          'Zustände haben: Strom an (1) oder Strom aus (0).',
        hints: {
          stups: 'Denk daran, womit ein Computer im Inneren überhaupt arbeitet.',
          hinweis: 'Es geht um elektrische Signale — und wie viele Zustände die haben können.',
          loesung:
            'Ein Computer wird durch elektrische Signale gesteuert. Diese können nur zwei ' +
            'Zustände haben: Strom an (1) oder Strom aus (0).',
        },
        check: () => ({ ok: true }),
      },
      ...toBin.map((v, i) => toBinaryTask(`m4-bin-${i}`, v)),
      ...toDec.map((v, i) => toDecimalTask(`m4-dec-${i}`, v)),
      {
        id: 'm4-hex',
        kind: 'text',
        prompt:
          'Nenne ein weiteres Zahlensystem, das in der Informatik eine Rolle spielt.',
        answer: 'Das Hexadezimalsystem (Basis 16).',
        hints: {
          stups: 'Es wird zum Beispiel für Farbcodes wie #FF8800 benutzt.',
          hinweis: 'Es hat 16 statt 2 oder 10 Ziffern: 0-9 und dann A bis F.',
          loesung: 'Das Hexadezimalsystem (Basis 16).',
        },
        check: (raw) =>
          checkKeywords(raw, [['hexadezimal', 'hexa', 'sedezimal']]),
      },
    ]
  },
}
