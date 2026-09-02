import { formatValue, toText, type ChartSpec, type Sheet } from '@quali/core'

/**
 * Excel's own Office accent colours.
 *
 * These do not pass the usual palette bands — the grey slot reads grey by design and the
 * yellow sits above the lightness band — but the point of this trainer is that a student
 * recognises the chart they will produce in the exam. The relief the contrast check demands
 * is direct labels, which is exactly what the 2026 paper asks for
 * („Datenbeschriftungen (Prozentwerte)"), so labels are always drawn on pie slices.
 * CVD separation does pass, so the slices stay distinguishable.
 */
const SERIES = ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47']

export interface ChartData {
  readonly labels: string[]
  readonly values: number[]
}

/**
 * Read a chart's data out of its source range.
 * Two or more columns: the first holds the labels, the second the values — the shape every
 * chart task in the corpus uses. A single column is values with 1..n as labels.
 */
export function readChartData(sheet: Sheet, spec: ChartSpec): ChartData {
  const left = Math.min(spec.source.start.col, spec.source.end.col)
  const right = Math.max(spec.source.start.col, spec.source.end.col)
  const top = Math.min(spec.source.start.row, spec.source.end.row)
  const bottom = Math.max(spec.source.start.row, spec.source.end.row)

  const labels: string[] = []
  const values: number[] = []
  for (let row = top; row <= bottom; row++) {
    const labelCell = right > left ? { row, col: left, colAbs: false, rowAbs: false } : null
    const valueCell = { row, col: right > left ? left + 1 : left, colAbs: false, rowAbs: false }
    const value = sheet.getValue(valueCell)
    if (typeof value !== 'number') continue
    labels.push(labelCell ? toText(sheet.getValue(labelCell)) : String(row - top + 1))
    values.push(value)
  }
  return { labels, values }
}

const W = 340
const H = 210
const PAD = { top: 26, right: 12, bottom: 30, left: 42 }

export function Chart({ sheet, spec }: { sheet: Sheet; spec: ChartSpec }) {
  const data = readChartData(sheet, spec)
  if (data.values.length === 0) {
    return <p className="chart-empty">Der Datenbereich enthält keine Zahlen.</p>
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chartsvg" role="img">
      {spec.title && (
        <text x={W / 2} y="15" textAnchor="middle" className="chart-title">{spec.title}</text>
      )}
      {spec.kind === 'pie' ? <Pie data={data} spec={spec} /> : <Cartesian data={data} spec={spec} />}
    </svg>
  )
}

function Pie({ data, spec }: { data: ChartData; spec: ChartSpec }) {
  const total = data.values.reduce((sum, value) => sum + value, 0)
  const cx = 120
  const cy = 118
  const r = 72
  let angle = -Math.PI / 2

  return (
    <>
      {data.values.map((value, index) => {
        const sweep = total === 0 ? 0 : (value / total) * Math.PI * 2
        const from = angle
        const to = angle + sweep
        angle = to
        const large = sweep > Math.PI ? 1 : 0
        const path = [
          `M ${cx} ${cy}`,
          `L ${cx + r * Math.cos(from)} ${cy + r * Math.sin(from)}`,
          `A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(to)} ${cy + r * Math.sin(to)}`,
          'Z',
        ].join(' ')
        const mid = (from + to) / 2
        const share = total === 0 ? 0 : (value / total) * 100

        return (
          <g key={index}>
            {/* A 2px surface ring keeps neighbouring slices apart for the CVD case. */}
            <path d={path} fill={SERIES[index % SERIES.length]} stroke="#fff" strokeWidth="2" />
            {spec.dataLabels !== 'none' && sweep > 0.18 && (
              <text
                x={cx + r * 0.68 * Math.cos(mid)}
                y={cy + r * 0.68 * Math.sin(mid) + 3}
                textAnchor="middle"
                className="chart-datalabel"
              >
                {spec.dataLabels === 'percent'
                  ? `${share.toFixed(1).replace('.', ',')} %`
                  : formatValue(value, { kind: 'general' }).text}
              </text>
            )}
          </g>
        )
      })}
      {/* Identity is never colour alone: every slice is named in the legend. */}
      {data.labels.map((label, index) => (
        <g key={label + index} transform={`translate(214 ${44 + index * 16})`}>
          <rect width="9" height="9" y="-8" fill={SERIES[index % SERIES.length]} />
          <text x="13" y="0" className="chart-legend">{label}</text>
        </g>
      ))}
    </>
  )
}

function Cartesian({ data, spec }: { data: ChartData; spec: ChartSpec }) {
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const max = Math.max(...data.values, 0)
  const min = Math.min(...data.values, 0)
  const span = max - min || 1
  const y = (value: number) => PAD.top + plotH - ((value - min) / span) * plotH
  const horizontal = spec.kind === 'bar'

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => min + fraction * span)
  const step = horizontal ? plotH / data.values.length : plotW / data.values.length
  const thickness = step * 0.62

  return (
    <>
      {/* Recessive gridlines, drawn behind the marks. */}
      {!horizontal &&
        ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} y1={y(tick)} x2={W - PAD.right} y2={y(tick)} className="chart-grid" />
            <text x={PAD.left - 6} y={y(tick) + 3} textAnchor="end" className="chart-tick">
              {formatValue(Math.round(tick), { kind: 'general' }).text}
            </text>
          </g>
        ))}
      <line x1={PAD.left} y1={y(min)} x2={W - PAD.right} y2={y(min)} className="chart-axis" />

      {(spec.kind === 'column' || spec.kind === 'bar') &&
        data.values.map((value, index) =>
          horizontal ? (
            <rect
              key={index}
              x={PAD.left}
              y={PAD.top + index * step + (step - thickness) / 2}
              width={Math.max(((value - min) / span) * plotW, 1)}
              height={thickness}
              fill={SERIES[0]}
            />
          ) : (
            <rect
              key={index}
              x={PAD.left + index * step + (step - thickness) / 2}
              y={Math.min(y(value), y(0))}
              width={thickness}
              height={Math.max(Math.abs(y(value) - y(0)), 1)}
              fill={SERIES[0]}
            />
          ),
        )}

      {(spec.kind === 'line' || spec.kind === 'area') && (
        <>
          {spec.kind === 'area' && (
            <path
              d={
                `M ${PAD.left + step / 2} ${y(min)} ` +
                data.values
                  .map((value, index) => `L ${PAD.left + step / 2 + index * step} ${y(value)}`)
                  .join(' ') +
                ` L ${PAD.left + step / 2 + (data.values.length - 1) * step} ${y(min)} Z`
              }
              fill={SERIES[0]}
              fillOpacity="0.35"
            />
          )}
          <polyline
            points={data.values
              .map((value, index) => `${PAD.left + step / 2 + index * step},${y(value)}`)
              .join(' ')}
            fill="none"
            stroke={SERIES[0]}
            strokeWidth="2"
          />
          {data.values.map((value, index) => (
            <circle
              key={index}
              cx={PAD.left + step / 2 + index * step}
              cy={y(value)}
              r="3.5"
              fill={SERIES[0]}
              stroke="#fff"
              strokeWidth="1.5"
            />
          ))}
        </>
      )}

      {!horizontal &&
        data.labels.map((label, index) => (
          <text
            key={label + index}
            x={PAD.left + step / 2 + index * step}
            y={H - PAD.bottom + 14}
            textAnchor="middle"
            className="chart-tick"
          >
            {label.length > 8 ? `${label.slice(0, 7)}…` : label}
          </text>
        ))}
      {horizontal &&
        data.labels.map((label, index) => (
          <text
            key={label + index}
            x={PAD.left - 6}
            y={PAD.top + index * step + step / 2 + 3}
            textAnchor="end"
            className="chart-tick"
          >
            {label.length > 6 ? `${label.slice(0, 5)}…` : label}
          </text>
        ))}

      {spec.axisTitles.x && (
        <text x={W / 2} y={H - 3} textAnchor="middle" className="chart-axistitle">
          {spec.axisTitles.x}
        </text>
      )}
      {spec.axisTitles.y && (
        <text
          transform={`translate(11 ${PAD.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
          className="chart-axistitle"
        >
          {spec.axisTitles.y}
        </text>
      )}
    </>
  )
}
