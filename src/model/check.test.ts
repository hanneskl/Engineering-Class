import { describe, expect, it } from 'vitest'
import { checkKeywords, checkToBinary, checkToDecimal, normalize } from './check'
import { decompose } from '../lessons/m4-binaer'
import { distinctInts, rng, seedFromName } from './rng'

describe('normalize', () => {
  it('folds umlauts and punctuation', () => {
    expect(normalize('Für-Übung, groß!')).toBe('fuer uebung gross')
  })
})

describe('checkToBinary', () => {
  it('accepts the exact answer', () => {
    // The three values from Quali 2026.
    expect(checkToBinary('11101', 29).ok).toBe(true)
    expect(checkToBinary('10001', 17).ok).toBe(true)
    expect(checkToBinary('111111', 63).ok).toBe(true)
  })

  it('tolerates leading zeros and whitespace', () => {
    expect(checkToBinary(' 0011101 ', 29).ok).toBe(true)
  })

  it('names the reversal mistake specifically', () => {
    const r = checkToBinary('10111', 29) // 11101 backwards
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.code).toBe('REVERSED')
  })

  it('rejects non-binary digits with a dedicated code', () => {
    const r = checkToBinary('1201', 9)
    expect(r.ok === false && r.code).toBe('NOT_BINARY')
  })

  it('tells the student what their number is worth', () => {
    const r = checkToBinary('11111', 29) // 31
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.message).toContain('31')
    expect(r.ok === false && r.why).toContain('2')
  })

  it('flags an empty answer rather than marking it wrong', () => {
    expect(checkToBinary('  ', 29).ok === false && checkToBinary('', 29)).toBeTruthy()
    const r = checkToBinary('', 29)
    expect(r.ok === false && r.code).toBe('EMPTY')
  })
})

describe('checkToDecimal', () => {
  it('accepts the exact answer', () => {
    // The three values from Quali 2026.
    expect(checkToDecimal('7', '111').ok).toBe(true)
    expect(checkToDecimal('21', '10101').ok).toBe(true)
    expect(checkToDecimal('16', '10000').ok).toBe(true)
  })

  it('detects reading the bits from the wrong end', () => {
    // 10000 read backwards is 00001 = 1.
    const r = checkToDecimal('1', '10000')
    expect(r.ok === false && r.code).toBe('READ_BACKWARDS')
  })

  it('explains which binary number their answer would match', () => {
    const r = checkToDecimal('20', '10101')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.why).toContain('10100')
  })

  it('rejects non-numeric input', () => {
    expect(checkToDecimal('zwölf', '1100').ok === false).toBe(true)
    const r = checkToDecimal('zwölf', '1100')
    expect(r.ok === false && r.code).toBe('NOT_A_NUMBER')
  })
})

describe('checkKeywords', () => {
  const ip = [['internet'], ['protocol', 'protokoll']]

  it('accepts either spelling, spaced or joined', () => {
    expect(checkKeywords('Internet Protocol', ip, 'x').ok).toBe(true)
    expect(checkKeywords('internetprotokoll', ip, 'x').ok).toBe(true)
  })

  it('reports a partial answer differently from a wrong one', () => {
    const partial = checkKeywords('Internet Provider', ip, 'Internet Protocol')
    expect(partial.ok === false && partial.code).toBe('PARTIAL')

    const wrong = checkKeywords('keine Ahnung', ip, 'Internet Protocol')
    expect(wrong.ok === false && wrong.code).toBe('WRONG')
  })
})

describe('decompose', () => {
  it('splits into powers of two, largest first', () => {
    expect(decompose(29)).toEqual([16, 8, 4, 1])
    expect(decompose(63)).toEqual([32, 16, 8, 4, 2, 1])
  })

  it('always sums back to the original', () => {
    for (let n = 1; n <= 255; n++) {
      expect(decompose(n).reduce((a, b) => a + b, 0)).toBe(n)
    }
  })
})

describe('per-student variants', () => {
  it('gives different students different numbers', () => {
    const forName = (name: string) =>
      distinctInts(rng(seedFromName(name) ^ 0x4b1), 4, 12, 99).join(',')
    expect(forName('Mathilda')).not.toBe(forName('Ludwig'))
  })

  it('is stable for the same student', () => {
    const a = distinctInts(rng(seedFromName('Timi') ^ 0x4b1), 4, 12, 99)
    const b = distinctInts(rng(seedFromName('timi ') ^ 0x4b1), 4, 12, 99)
    expect(a).toEqual(b)
  })

  it('always produces the requested count of distinct values', () => {
    for (const name of ['Eliah', 'Johannes', 'Lorenz', 'Mathilda', 'Timi', 'Ludwig']) {
      const values = distinctInts(rng(seedFromName(name)), 2, 12, 31)
      expect(values).toHaveLength(2)
      expect(new Set(values).size).toBe(2)
    }
  })
})
