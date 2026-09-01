import { describe, expect, it } from 'vitest'
import { canonical, parseFormula, translateInput } from '../src/parser.ts'
import { Sheet } from '../src/sheet.ts'
import { isError, type CellValue } from '../src/values.ts'

function evalIn(sheet: Sheet, formula: string): CellValue {
  return sheet.evaluateFormula(formula)
}

function blank(): Sheet {
  return new Sheet('Tabelle1')
}

describe('tokenizer and parser', () => {
  it('parses German argument and decimal separators', () => {
    expect(canonical('=RUNDEN(1,5;2)')).toBe('RUNDEN(1.5;2)')
  })

  it('distinguishes a reference from a function name', () => {
    expect(canonical('=A1')).toBe('A1')
    expect(canonical('=SUMME(A1:A3)')).toBe('SUMME(A1:A3)')
  })

  it('preserves absolute markers', () => {
    expect(canonical('=B3*$G$2')).toBe('B3*$G$2')
    expect(canonical('=$B8+B$8')).toBe('$B8+B$8')
  })

  it('drops redundant parentheses but keeps necessary ones', () => {
    expect(canonical('=(1+2)*3')).toBe('(1+2)*3')
    expect(canonical('=1+(2*3)')).toBe('1+2*3')
  })

  it('reports German messages for malformed input', () => {
    expect(() => parseFormula('=SUMME(A1;')).toThrow(/unvollständig/i)
    expect(() => parseFormula('=1+')).toThrow(/unvollständig/i)
  })
})

describe('operator precedence — „Beachte Punkt vor Strich!"', () => {
  const sheet = blank()

  it('multiplies before adding', () => {
    expect(evalIn(sheet, '=2+3*4')).toBe(14)
  })

  it('honours parentheses', () => {
    expect(evalIn(sheet, '=(2+3)*4')).toBe(20)
  })

  it('divides left to right', () => {
    expect(evalIn(sheet, '=96/3/4')).toBe(8)
  })

  it('returns #DIV/0! rather than Infinity', () => {
    const result = evalIn(sheet, '=1/0')
    expect(isError(result) && result.code).toBe('#DIV/0!')
  })
})

describe('the nine German functions', () => {
  const sheet = blank()
  sheet.load({ A1: 10, A2: 20, A3: 30, A4: 'Text', A5: '' })

  it('SUMME ignores text inside a range', () => {
    expect(evalIn(sheet, '=SUMME(A1:A5)')).toBe(60)
  })

  it('MITTELWERT divides by the count of numbers only', () => {
    expect(evalIn(sheet, '=MITTELWERT(A1:A5)')).toBe(20)
  })

  it('MAX and MIN', () => {
    expect(evalIn(sheet, '=MAX(A1:A3)')).toBe(30)
    expect(evalIn(sheet, '=MIN(A1:A3)')).toBe(10)
  })

  it('ANZAHL counts numbers, not text', () => {
    expect(evalIn(sheet, '=ANZAHL(A1:A5)')).toBe(3)
  })

  it('PRODUKT multiplies', () => {
    expect(evalIn(sheet, '=PRODUKT(A1:A3)')).toBe(6000)
  })

  it('WENN picks a branch and defaults the else to FALSCH', () => {
    expect(evalIn(sheet, '=WENN(A1>5;"Ja";"Nein")')).toBe('Ja')
    expect(evalIn(sheet, '=WENN(A1>50;"Ja";"Nein")')).toBe('Nein')
    expect(evalIn(sheet, '=WENN(A1>50;"Ja")')).toBe(false)
  })

  it('ZÄHLENWENN accepts a comparison criterion', () => {
    expect(evalIn(sheet, '=ZÄHLENWENN(A1:A3;">15")')).toBe(2)
    expect(evalIn(sheet, '=ZÄHLENWENN(A1:A5;"Text")')).toBe(1)
  })

  it('RUNDEN rounds half away from zero, unlike JavaScript', () => {
    expect(evalIn(sheet, '=RUNDEN(12678,5678;2)')).toBe(12678.57)
    expect(evalIn(sheet, '=RUNDEN(2,5;0)')).toBe(3)
    expect(evalIn(sheet, '=RUNDEN(-2,5;0)')).toBe(-3)
  })
})

describe('English function names are rejected with a hint', () => {
  const sheet = blank()
  sheet.load({ A1: 1, A2: 2 })

  it('names the German equivalent', () => {
    const result = evalIn(sheet, '=SUM(A1:A2)')
    expect(isError(result)).toBe(true)
    if (isError(result)) {
      expect(result.code).toBe('#NAME?')
      expect(result.message).toContain('SUMME')
    }
  })

  it('rejects IF in favour of WENN', () => {
    const result = evalIn(sheet, '=IF(A1>0;1;0)')
    expect(isError(result) && result.message).toContain('WENN')
  })
})

describe('sheet recalculation', () => {
  it('propagates through dependent cells', () => {
    const sheet = blank()
    sheet.load({ A1: 5, A2: 3 })
    sheet.setInput('A3', '=A1+A2')
    sheet.setInput('A4', '=A3*2')
    expect(sheet.getValue('A4')).toBe(16)

    sheet.setInput('A1', '10')
    expect(sheet.getValue('A4')).toBe(26)
  })

  it('reports a circular reference instead of hanging', () => {
    const sheet = blank()
    sheet.setInput('A1', '=A1+1')
    const result = sheet.getValue('A1')
    expect(isError(result) && result.code).toBe('#BEZUG!')
  })

  it('treats an empty cell as zero in arithmetic but skips it in SUMME', () => {
    const sheet = blank()
    sheet.load({ A1: 5 })
    expect(sheet.evaluateFormula('=A1+A2')).toBe(5)
    expect(sheet.evaluateFormula('=MITTELWERT(A1:A2)')).toBe(5)
  })
})

describe('translateInput — the primitive behind fill, drag and paste', () => {
  it('moves relative references and pins absolute ones', () => {
    expect(translateInput('=B3*$G$2', 1, 0)).toBe('=B4*$G$2')
    expect(translateInput('=B3*$G$2', 3, 0)).toBe('=B6*$G$2')
    expect(translateInput('=B3*G2', 1, 1)).toBe('=C4*H3')
  })

  it('moves only the unpinned half of a mixed reference', () => {
    expect(translateInput('=$B3+B$3', 2, 2)).toBe('=$B5+D$3')
  })

  it('translates both ends of a range', () => {
    expect(translateInput('=SUMME(B2:B6)', 0, 1)).toBe('=SUMME(C2:C6)')
  })

  it('copies literals unchanged, as Excel does for a single-cell drag', () => {
    expect(translateInput('220', 5, 0)).toBe('220')
    expect(translateInput('Lukas', 5, 0)).toBe('Lukas')
  })

  it('copies an unparseable formula verbatim rather than mangling it', () => {
    expect(translateInput('=SUMME(B2:', 1, 0)).toBe('=SUMME(B2:')
  })
})
