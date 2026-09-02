import type { DeviceType } from '../model/plan'
import { fotoFuer } from './fotos'

/**
 * Pictures of the devices, for the "which device is this?" board in M1.
 *
 * The line icons on the canvas are deliberately abstract — at 34 pixels next
 * to a label they only have to be told apart. Asked to *name* a device from
 * its picture alone, they were not enough: a router and a modem are the same
 * little box. These are drawn much larger and with the details a student would
 * actually recognise on a shelf at home — the router's antennas, the switch's
 * row of ports, the repeater's plug, the printer's sheet of paper.
 *
 * Each sits on its own pale tile, like a product photo on a white background,
 * so the colours hold in both themes without any of them being theme tokens.
 *
 * They are the fallback, not the goal: as soon as a real photograph of a
 * device sits in src/fotos/, that photo is shown instead. A drawing is better
 * than a wrong photo, and better than an empty box while the photos are being
 * sourced.
 */

const GEHAEUSE = '#3c4a5c'
const GEHAEUSE_HELL = '#55647a'
const METALL = '#cbd5e1'
const KANTE = '#94a3b8'
const PLASTIK = '#e2e8f0'
const PAPIER = '#f8fafc'
const LED_AN = '#4ade80'
const LED_WARTET = '#fbbf24'
const FUNK = '#38bdf8'

/** Radio waves, drawn as arcs opening upwards from a point. */
function Funk({ x, y, radien }: { x: number; y: number; radien: number[] }) {
  return (
    <g stroke={FUNK} strokeWidth="3" fill="none" strokeLinecap="round">
      {radien.map((r) => (
        <path key={r} d={`M ${x - r} ${y} A ${r} ${r} 0 0 1 ${x + r} ${y}`} />
      ))}
    </g>
  )
}

const BILDER: Record<string, JSX.Element> = {
  router: (
    <g>
      {/* Two antennas, the thing everyone recognises a router by. */}
      <g stroke={GEHAEUSE_HELL} strokeWidth="5" strokeLinecap="round">
        <path d="M32 48 24 18" />
        <path d="M64 48 72 18" />
      </g>
      <rect x="14" y="46" width="68" height="30" rx="6" fill={GEHAEUSE} />
      <rect x="14" y="46" width="68" height="8" rx="6" fill={GEHAEUSE_HELL} />
      <g>
        <circle cx="28" cy="66" r="3" fill={LED_AN} />
        <circle cx="40" cy="66" r="3" fill={LED_AN} />
        <circle cx="52" cy="66" r="3" fill={LED_WARTET} />
        <circle cx="64" cy="66" r="3" fill={KANTE} />
      </g>
      <rect x="20" y="76" width="10" height="4" rx="2" fill={KANTE} />
      <rect x="66" y="76" width="10" height="4" rx="2" fill={KANTE} />
    </g>
  ),

  switch: (
    <g>
      {/* Rack ears and a long row of ports: a switch is all sockets. */}
      <rect x="6" y="40" width="8" height="24" rx="2" fill={KANTE} />
      <rect x="82" y="40" width="8" height="24" rx="2" fill={KANTE} />
      <rect x="12" y="34" width="72" height="34" rx="4" fill={GEHAEUSE} />
      <g fill={METALL}>
        {[16, 25, 34, 43, 52, 61, 70].map((x) => (
          <g key={x}>
            <rect x={x} y="46" width="7" height="10" rx="1" />
            <rect x={x + 2} y="44" width="3" height="3" fill={METALL} />
          </g>
        ))}
      </g>
      <g fill={LED_AN}>
        {[16, 25, 34, 43, 52, 61, 70].map((x) => (
          <circle key={x} cx={x + 3.5} cy="40" r="1.6" />
        ))}
      </g>
    </g>
  ),

  accesspoint: (
    <g>
      {/* The flat disc that sits on a ceiling. */}
      <Funk x={48} y={38} radien={[14, 24]} />
      <path d="M18 62 A 30 18 0 0 1 78 62 Z" fill={PAPIER} stroke={KANTE} strokeWidth="2" />
      <ellipse cx="48" cy="62" rx="30" ry="9" fill={PLASTIK} stroke={KANTE} strokeWidth="2" />
      <circle cx="48" cy="60" r="3.5" fill={FUNK} />
      <rect x="44" y="71" width="8" height="8" rx="2" fill={KANTE} />
    </g>
  ),

  repeater: (
    <g>
      {/* A plug-in box: pins at the bottom, and it both receives and sends. */}
      <Funk x={48} y={22} radien={[13, 22]} />
      <rect x="28" y="26" width="40" height="40" rx="7" fill={PLASTIK} stroke={KANTE} strokeWidth="2" />
      <g fill={LED_AN}>
        <rect x="38" y="52" width="5" height="6" rx="1" />
        <rect x="46" y="46" width="5" height="12" rx="1" />
        <rect x="54" y="40" width="5" height="18" rx="1" />
      </g>
      {/* The two pins are what says "goes straight into a socket". */}
      <rect x="36" y="66" width="8" height="18" rx="3" fill={GEHAEUSE_HELL} />
      <rect x="52" y="66" width="8" height="18" rx="3" fill={GEHAEUSE_HELL} />
    </g>
  ),

  modem: (
    <g>
      {/* No antennas — but a cable that goes into the wall socket. */}
      <rect x="16" y="38" width="52" height="30" rx="5" fill={GEHAEUSE} />
      <rect x="16" y="38" width="52" height="8" rx="5" fill={GEHAEUSE_HELL} />
      <g>
        <circle cx="28" cy="58" r="3" fill={LED_AN} />
        <circle cx="39" cy="58" r="3" fill={LED_AN} />
        <circle cx="50" cy="58" r="3" fill={LED_WARTET} />
      </g>
      <path
        d="M68 56 C 78 56 80 64 80 72"
        stroke={GEHAEUSE_HELL}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="70" y="70" width="20" height="16" rx="3" fill={PLASTIK} stroke={KANTE} strokeWidth="2" />
      <circle cx="80" cy="78" r="3.5" fill={KANTE} />
    </g>
  ),

  server: (
    <g>
      {/* A rack: several identical units stacked, each with its own lamp. */}
      <rect x="26" y="10" width="44" height="76" rx="5" fill={GEHAEUSE} />
      {[16, 34, 52, 70].map((y) => (
        <g key={y}>
          <rect x="30" y={y} width="36" height="14" rx="2" fill={GEHAEUSE_HELL} />
          <rect x="34" y={y + 5} width="18" height="4" rx="2" fill={METALL} />
          <circle cx="60" cy={y + 7} r="2.4" fill={LED_AN} />
        </g>
      ))}
    </g>
  ),

  nas: (
    <g>
      {/* A small box whose front is nothing but hard-disk bays. */}
      <rect x="28" y="20" width="40" height="56" rx="6" fill={GEHAEUSE} />
      <g>
        <rect x="34" y="28" width="12" height="36" rx="2" fill={METALL} />
        <rect x="50" y="28" width="12" height="36" rx="2" fill={METALL} />
        <path d="M38 34h4M54 34h4" stroke={KANTE} strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="48" cy="70" r="3" fill={FUNK} />
    </g>
  ),

  printer: (
    <g>
      {/* The sheet on its way out is the giveaway. */}
      <rect x="32" y="8" width="32" height="26" rx="2" fill={PAPIER} stroke={KANTE} strokeWidth="2" />
      <g stroke={KANTE} strokeWidth="2" strokeLinecap="round">
        <path d="M38 16h20M38 22h20M38 28h12" />
      </g>
      <rect x="20" y="34" width="56" height="32" rx="5" fill={GEHAEUSE} />
      <rect x="30" y="38" width="36" height="5" rx="2" fill="#1f2937" />
      <circle cx="66" cy="56" r="3" fill={LED_AN} />
      <rect x="26" y="66" width="44" height="10" rx="3" fill={GEHAEUSE_HELL} />
      <rect x="34" y="76" width="28" height="4" rx="2" fill={KANTE} />
    </g>
  ),
}

/**
 * A picture of one device. Falls back to nothing rather than to a wrong
 * drawing: only the types M1 asks about are illustrated.
 */
export function DeviceBild({ type, size = 96 }: { type: DeviceType; size?: number }) {
  const foto = fotoFuer(type)
  if (foto) {
    return (
      <img className="device-bild" src={foto} width={size} height={size} alt="" loading="lazy" />
    )
  }
  const bild = BILDER[type]
  if (!bild) return null
  return (
    <svg
      className="device-bild"
      viewBox="0 0 96 96"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="96" height="96" rx="12" fill="#eef2f7" />
      {bild}
    </svg>
  )
}

export function hatBild(type: DeviceType): boolean {
  return Boolean(BILDER[type])
}
