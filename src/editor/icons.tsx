import type { DeviceType } from '../model/plan'

/**
 * One glyph per device type, drawn in a 24×24 box. Kept flat and geometric so
 * they stay readable at the ~34px they render at on the canvas.
 */
const PATHS: Record<DeviceType, JSX.Element> = {
  internet: (
    <g>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.5 2.5 2.5 13 0 16M12 4c-2.5 2.5-2.5 13 0 16" />
    </g>
  ),
  modem: (
    <g>
      <rect x="3" y="9" width="18" height="9" rx="1.5" />
      <path d="M7 13.5h1.5M11 13.5h1.5M15 13.5h1.5" />
      <path d="M12 9V4" />
    </g>
  ),
  router: (
    <g>
      <rect x="3" y="12" width="18" height="7" rx="1.5" />
      <path d="M7 15.5h2M15 15.5h2" />
      <path d="M9 9 12 5l3 4" />
      <path d="M12 5v7" />
    </g>
  ),
  switch: (
    <g>
      <rect x="3" y="8" width="18" height="9" rx="1.5" />
      <path d="M7 17v3M11 17v3M15 17v3M19 17v3" />
      <path d="M6 12h12" />
    </g>
  ),
  accesspoint: (
    <g>
      <rect x="7" y="14" width="10" height="6" rx="1.5" />
      <path d="M8.5 10a5 5 0 0 1 7 0M6 7.5a8.5 8.5 0 0 1 12 0" />
    </g>
  ),
  repeater: (
    <g>
      <rect x="9" y="13" width="6" height="7" rx="1.5" />
      <path d="M6.5 10a6 6 0 0 1 11 0" />
      <path d="M3.5 7a10 10 0 0 1 17 0" />
    </g>
  ),
  pc: (
    <g>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M9 20h6M12 16v4" />
    </g>
  ),
  laptop: (
    <g>
      <rect x="5" y="5" width="14" height="10" rx="1.5" />
      <path d="M2 18h20" />
    </g>
  ),
  smartphone: (
    <g>
      <rect x="8" y="3" width="8" height="18" rx="2" />
      <path d="M11 18h2" />
    </g>
  ),
  tablet: (
    <g>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M11 18h2" />
    </g>
  ),
  console: (
    <g>
      <rect x="2" y="8" width="20" height="10" rx="4" />
      <path d="M7 11v4M5 13h4M16 12.5h.01M18.5 14.5h.01" />
    </g>
  ),
  printer: (
    <g>
      <rect x="6" y="3" width="12" height="5" />
      <rect x="3" y="8" width="18" height="8" rx="1.5" />
      <rect x="7" y="16" width="10" height="5" />
    </g>
  ),
  tv: (
    <g>
      <rect x="2" y="4" width="20" height="13" rx="1.5" />
      <path d="M8 21h8" />
    </g>
  ),
  server: (
    <g>
      <rect x="4" y="3" width="16" height="7" rx="1.5" />
      <rect x="4" y="14" width="16" height="7" rx="1.5" />
      <path d="M8 6.5h.01M8 17.5h.01" />
    </g>
  ),
  nas: (
    <g>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 7h6M9 11h6M9 15h3" />
    </g>
  ),
}

export function DeviceIcon({ type, size = 24 }: { type: DeviceType; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[type]}
    </svg>
  )
}
