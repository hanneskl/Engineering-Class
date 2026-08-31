import type { CheckResult } from './types'

/**
 * Answer checking.
 *
 * Every failure path here has to explain itself in German. A student working
 * alone gets nothing out of "falsch" — they need to know *what* they did, which
 * for binary conversion is almost always one of a handful of specific mistakes.
 */

/** Lowercase, fold umlauts, drop punctuation, collapse whitespace. */
export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // NFD splits accents off their base letter; the next line then drops them.
    .normalize('NFD')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Required keywords as an AND of ORs.
 * `[['internet'], ['protocol', 'protokoll']]` accepts "Internet Protocol" and
 * "Internetprotokoll" but not "Internet Provider".
 */
export type Keywords = string[][]

function groupsHit(text: string, keywords: Keywords): number {
  const flat = text.replace(/ /g, '')
  return keywords.filter((group) =>
    group.some((word) => {
      const w = normalize(word)
      // Match with and without spaces so "internetprotokoll" hits too.
      return text.includes(w) || flat.includes(w.replace(/ /g, ''))
    }),
  ).length
}

export function checkKeywords(raw: string, keywords: Keywords, answer: string): CheckResult {
  const text = normalize(raw)
  if (!text) {
    return {
      code: 'EMPTY',
      ok: false,
      message: 'Da steht noch nichts.',
      why: 'Schreib deine Antwort in das Feld — auch ein Versuch bringt dich weiter.',
    }
  }

  const hits = groupsHit(text, keywords)
  if (hits === keywords.length) return { ok: true }

  if (hits > 0) {
    return {
      code: 'PARTIAL',
      ok: false,
      message: 'Du bist auf dem richtigen Weg, aber es fehlt noch etwas.',
      why: `Die vollständige Antwort lautet: ${answer}`,
    }
  }

  return {
    code: 'WRONG',
    ok: false,
    message: 'Das ist es leider noch nicht.',
    why: 'Schau dir den Hinweis an, dann probier es noch einmal.',
  }
}

export function checkChoice(raw: string, correct: string): CheckResult {
  if (!raw) {
    return { code: 'EMPTY', ok: false, message: 'Wähle eine Antwort aus.' }
  }
  if (raw === correct) return { ok: true }
  return {
    code: 'WRONG_CHOICE',
    ok: false,
    message: 'Das stimmt nicht.',
    why: 'Lies die Möglichkeiten noch einmal in Ruhe durch.',
  }
}

// ---------------------------------------------------------------------------
// Binary
// ---------------------------------------------------------------------------

export function toBinary(n: number): string {
  return n.toString(2)
}

export function reverseString(s: string): string {
  return [...s].reverse().join('')
}

/**
 * Decimal -> binary.
 *
 * The reversal check is first on purpose: writing the bits backwards is by far
 * the most common mistake with the Stellenwert table, because the table is read
 * right to left (Stelle 1 is the *last* digit) and students write it downwards.
 */
export function checkToBinary(raw: string, target: number): CheckResult {
  const text = raw.trim().replace(/\s/g, '')
  if (!text) {
    return {
      code: 'EMPTY',
      ok: false,
      message: 'Da steht noch nichts.',
      why: 'Trag deine Binärzahl ein, zum Beispiel 1011.',
    }
  }

  if (!/^[01]+$/.test(text)) {
    return {
      code: 'NOT_BINARY',
      ok: false,
      message: 'Eine Binärzahl besteht nur aus Nullen und Einsen.',
      why: `In deiner Antwort steht "${raw.trim()}". Erlaubt sind nur 0 und 1.`,
    }
  }

  const expected = toBinary(target)
  if (text === expected) return { ok: true }

  // Leading zeros are harmless — accept, but say so.
  if (text.replace(/^0+/, '') === expected) {
    return { ok: true, message: 'Richtig! (Die Nullen ganz vorne kannst du weglassen.)' }
  }

  if (reverseString(text) === expected) {
    return {
      code: 'REVERSED',
      ok: false,
      message: 'Du hast die richtigen Stellen gefunden, aber verkehrt herum aufgeschrieben.',
      why:
        'In der Stellenwert-Tabelle ist Stelle 1 die kleinste (Wert 1) — und die steht ' +
        'in der Binärzahl ganz rechts. Dreh deine Antwort um.',
    }
  }

  const theirValue = parseInt(text, 2)
  return {
    code: 'WRONG_VALUE',
    ok: false,
    message: `Deine Zahl ${text} ergibt ${theirValue}, gesucht ist aber ${target}.`,
    why:
      theirValue > target
        ? `Du hast ${theirValue - target} zu viel. Welche Stelle ist zu viel gesetzt?`
        : `Dir fehlen noch ${target - theirValue}. Welche Stelle fehlt?`,
  }
}

/** Binary -> decimal. */
export function checkToDecimal(raw: string, bits: string): CheckResult {
  const text = raw.trim().replace(/[\s.]/g, '')
  if (!text) {
    return {
      code: 'EMPTY',
      ok: false,
      message: 'Da steht noch nichts.',
      why: 'Trag deine Dezimalzahl ein, zum Beispiel 13.',
    }
  }

  if (!/^\d+$/.test(text)) {
    return {
      code: 'NOT_A_NUMBER',
      ok: false,
      message: 'Trag bitte nur eine Zahl ein.',
      why: `In deiner Antwort steht "${raw.trim()}".`,
    }
  }

  const target = parseInt(bits, 2)
  const theirValue = parseInt(text, 10)
  if (theirValue === target) return { ok: true }

  if (theirValue === parseInt(reverseString(bits), 2)) {
    return {
      code: 'READ_BACKWARDS',
      ok: false,
      message: 'Du hast die Binärzahl von der falschen Seite gelesen.',
      why:
        'Die kleinste Stelle (Wert 1) steht ganz rechts, nicht ganz links. ' +
        `Rechne ${bits} noch einmal von rechts nach links.`,
    }
  }

  return {
    code: 'WRONG_VALUE',
    ok: false,
    message: `${theirValue} ist es nicht.`,
    why:
      theirValue > 0 && theirValue < 4096
        ? `${theirValue} wäre die Antwort für die Binärzahl ${toBinary(theirValue)}. ` +
          `Gefragt war aber ${bits}.`
        : `Zähle die Werte der gesetzten Stellen von ${bits} zusammen.`,
  }
}
