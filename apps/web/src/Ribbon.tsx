import type { CellStyle, NumberFormat } from '@quali/core'
import { PALETTE } from '@quali/scenarios'
import type { Rect } from './selection.ts'

interface RibbonProps {
  /** Style of the anchor cell, so the buttons can show what is already on. */
  current: CellStyle
  selection: Rect
  onStyle: (patch: Partial<CellStyle>) => void
  onNumberFormat: (format: NumberFormat) => void
  onMerge: () => void
  isMerged: boolean
}

const FILLS: [string, string][] = [
  ['Hellblau', PALETTE.hellblau],
  ['Gelb', PALETTE.gelb],
  ['Rot', PALETTE.rot],
  ['Grün', PALETTE.gruen],
  ['Weiß', PALETTE.weiss],
]

const FONT_COLOURS: [string, string][] = [
  ['Schwarz', '#000000'],
  ['Weiß', '#ffffff'],
  ['Rot', '#c00000'],
  ['Blau', '#1d4ed8'],
]

export function Ribbon({
  current,
  onStyle,
  onNumberFormat,
  onMerge,
  isMerged,
}: RibbonProps) {
  const format = current.numberFormat

  return (
    <div className="ribbon">
      <div className="group">
        <button
          className={current.bold ? 'tool on' : 'tool'}
          title="Fett"
          onClick={() => onStyle({ bold: !current.bold })}
        >
          <b>F</b>
        </button>
        <button
          className={current.italic ? 'tool on' : 'tool'}
          title="Kursiv"
          onClick={() => onStyle({ italic: !current.italic })}
        >
          <i>K</i>
        </button>
        <button
          className={current.underline ? 'tool on' : 'tool'}
          title="Unterstrichen"
          onClick={() => onStyle({ underline: !current.underline })}
        >
          <u>U</u>
        </button>
      </div>

      <div className="group">
        {(['left', 'center', 'right'] as const).map((align) => (
          <button
            key={align}
            className={current.hAlign === align ? 'tool on' : 'tool'}
            title={{ left: 'Linksbündig', center: 'Zentriert', right: 'Rechtsbündig' }[align]}
            onClick={() => onStyle({ hAlign: align })}
          >
            {{ left: '⯇', center: '≡', right: '⯈' }[align]}
          </button>
        ))}
        <button
          className={current.wrap ? 'tool on' : 'tool'}
          title="Text umbrechen"
          onClick={() => onStyle({ wrap: !current.wrap })}
        >
          ↵
        </button>
        <button
          className={isMerged ? 'tool on' : 'tool'}
          title="Verbinden und zentrieren"
          onClick={onMerge}
        >
          ⇔
        </button>
      </div>

      <div className="group">
        <span className="group-label">Füllung</span>
        {FILLS.map(([name, colour]) => (
          <button
            key={colour}
            className={current.fill === colour ? 'swatch on' : 'swatch'}
            style={{ background: colour }}
            title={name}
            onClick={() => onStyle({ fill: current.fill === colour ? null : colour })}
          />
        ))}
      </div>

      <div className="group">
        <span className="group-label">Schrift</span>
        {FONT_COLOURS.map(([name, colour]) => (
          <button
            key={colour}
            className={current.color === colour ? 'swatch on' : 'swatch'}
            style={{ background: colour }}
            title={name}
            onClick={() => onStyle({ color: colour })}
          />
        ))}
      </div>

      <div className="group">
        <select
          value={formatKey(format)}
          onChange={(event) => onNumberFormat(formatFromKey(event.target.value))}
          title="Zahlenformat"
        >
          <option value="general">Standard</option>
          <option value="number:0">Zahl, 0 Stellen</option>
          <option value="number:2">Zahl, 2 Stellen</option>
          <option value="currency:2">Währung € , 2 Stellen</option>
          <option value="currency:0">Währung € , 0 Stellen</option>
          <option value="percent:1">Prozent, 1 Stelle</option>
          <option value="percent:2">Prozent, 2 Stellen</option>
          <option value="date">Datum TT.MM.JJ</option>
        </select>
        {format.kind === 'currency' && (
          <button
            className={format.negativeRed ? 'tool on' : 'tool'}
            title="Negative Zahlen rot"
            onClick={() =>
              onNumberFormat({ ...format, negativeRed: !format.negativeRed })
            }
          >
            <span style={{ color: '#c00' }}>−</span>
          </button>
        )}
      </div>
    </div>
  )
}

function formatKey(format: NumberFormat): string {
  switch (format.kind) {
    case 'number': return `number:${format.decimals}`
    case 'currency': return `currency:${format.decimals}`
    case 'percent': return `percent:${format.decimals}`
    case 'date': return 'date'
    default: return 'general'
  }
}

function formatFromKey(key: string): NumberFormat {
  const [kind, decimals] = key.split(':')
  const places = Number(decimals ?? 0)
  switch (kind) {
    case 'number': return { kind: 'number', decimals: places }
    case 'currency': return { kind: 'currency', decimals: places, symbol: '€', negativeRed: false }
    case 'percent': return { kind: 'percent', decimals: places }
    case 'date': return { kind: 'date', pattern: 'DD.MM.YY' }
    default: return { kind: 'general' }
  }
}
