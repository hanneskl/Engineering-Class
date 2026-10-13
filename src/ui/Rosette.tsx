/**
 * A prize rosette — the pleated ribbon with two tails that a winning dog
 * or horse wears home from a show. Gold, silver or bronze by how the test
 * went, with the score in the middle. Pure SVG, scales to any size.
 */

export type Tier = 'gold' | 'silber' | 'bronze'

export function tierFor(correct: number, total: number): Tier {
  const share = total ? correct / total : 0
  if (share >= 10 / 12) return 'gold'
  if (share >= 7 / 12) return 'silber'
  return 'bronze'
}

const COLOURS: Record<Tier, { light: string; dark: string; ink: string }> = {
  gold: { light: '#f7cf4a', dark: '#c9960c', ink: '#5a3d00' },
  silber: { light: '#d8dde3', dark: '#8f99a6', ink: '#2c3440' },
  bronze: { light: '#d99a5b', dark: '#9c5a20', ink: '#3d2208' },
}

const PLEATS = 16

export function Rosette({
  tier,
  label,
  size = 64,
  title,
}: {
  tier: Tier
  /** What's printed in the centre — "11/12". */
  label: string
  size?: number
  title?: string
}) {
  const c = COLOURS[tier]
  // Pleats: a ring of overlapping discs around the centre disc.
  const pleats = Array.from({ length: PLEATS }, (_, i) => {
    const a = (i / PLEATS) * Math.PI * 2
    return { x: 50 + Math.cos(a) * 30, y: 44 + Math.sin(a) * 30 }
  })
  return (
    <svg
      className={`rosette rosette-${tier}`}
      viewBox="0 0 100 130"
      width={size}
      height={(size * 130) / 100}
      role="img"
      aria-label={title ?? `${tier}: ${label}`}
    >
      {title && <title>{title}</title>}
      {/* tails */}
      <polygon points="34,70 50,76 44,126 32,116 36,108 28,100" fill={c.dark} />
      <polygon points="66,70 50,76 56,126 68,116 64,108 72,100" fill={c.light} stroke={c.dark} strokeWidth="1" />
      {/* pleated ring */}
      {pleats.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="10" fill={i % 2 ? c.light : c.dark} />
      ))}
      <circle cx="50" cy="44" r="28" fill={c.light} />
      <circle cx="50" cy="44" r="21" fill="none" stroke={c.dark} strokeWidth="2.5" />
      <circle cx="50" cy="44" r="18" fill="#fff" fillOpacity=".55" />
      <text
        x="50"
        y="44"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={label.length > 4 ? 13 : 16}
        fontWeight="800"
        fill={c.ink}
        fontFamily="inherit"
      >
        {label}
      </text>
    </svg>
  )
}
