/**
 * Rendering a value under a number format (skills F10–F15).
 *
 * Lives in core rather than the UI because the format is a checkable property of the cell,
 * and both the grid and any server-side rendering need the same interpretation of it.
 */

import type { NumberFormat } from './model.js'
import { isError, toText, type CellValue } from './values.js'

/** German grouping: `1.234,56`. */
function groupDe(value: number, decimals: number): string {
  const fixed = Math.abs(value).toFixed(decimals)
  const [whole = '0', fraction] = fixed.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const sign = value < 0 ? '-' : ''
  return fraction ? `${sign}${grouped},${fraction}` : `${sign}${grouped}`
}

export interface FormattedValue {
  readonly text: string
  /** True when the format asks for negatives in red (F11). */
  readonly negativeRed: boolean
}

export function formatValue(value: CellValue, format: NumberFormat): FormattedValue {
  if (isError(value)) return { text: value.code, negativeRed: false }
  if (value === null) return { text: '', negativeRed: false }

  if (typeof value !== 'number') {
    return { text: toText(value), negativeRed: false }
  }

  switch (format.kind) {
    case 'number':
      return { text: groupDe(value, format.decimals), negativeRed: false }

    case 'currency':
      return {
        text: `${groupDe(value, format.decimals)} ${format.symbol}`,
        negativeRed: format.negativeRed && value < 0,
      }

    case 'percent':
      return { text: `${groupDe(value * 100, format.decimals)} %`, negativeRed: false }

    case 'date':
      return { text: formatDate(value, format.pattern), negativeRed: false }

    case 'general':
    default:
      // General shows enough precision to be honest without a wall of digits.
      return { text: groupDe(value, decimalsFor(value)), negativeRed: false }
  }
}

function decimalsFor(value: number): number {
  if (Number.isInteger(value)) return 0
  const rounded = Math.round(value * 100) / 100
  return rounded === value ? 2 : Math.min(6, (String(value).split('.')[1] ?? '').length)
}

/** Excel serial dates: day 1 is 1900-01-01. */
function formatDate(serial: number, pattern: 'DD.MM.YY' | 'DD.MM.YYYY'): string {
  const epoch = Date.UTC(1899, 11, 30)
  const date = new Date(epoch + Math.round(serial) * 86_400_000)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return pattern === 'DD.MM.YY'
    ? `${day}.${month}.${String(year).slice(-2)}`
    : `${day}.${month}.${year}`
}
