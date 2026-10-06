import { useLayoutEffect, useRef, useState } from 'react'
import { DEVICES, type Device, type Medium, type Plan, deviceById } from '../model/plan'
import { DeviceIcon } from './icons'

export const NODE = 64

/** How far the pointer may travel before a press counts as a drag, not a click. */
const DRAG_THRESHOLD = 5
/*
 * The drawing area is 900 units wide and as tall as the pane it is given.
 *
 * It used to be a fixed 900x560. Once the module shell stopped scrolling and
 * handed the canvas the full height of the screen, that fixed ratio letterboxed
 * itself and left roughly a third of the pane as dead margin. Width stays fixed
 * so saved coordinates keep their meaning; only the height follows the pane,
 * and only ever grows — a network drawn on a tall screen must still open on a
 * short one, so devices are never clamped above the floor.
 */
const VIEW_W = 900
const VIEW_H_MIN = 560

/** Tracks the element's height in view units, so the drawing fills its pane. */
function useViewHeight(ref: React.RefObject<SVGSVGElement | null>): number {
  const [height, setHeight] = useState(VIEW_H_MIN)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect
      if (!box || box.width === 0) return
      setHeight(Math.max(VIEW_H_MIN, Math.round((box.height / box.width) * VIEW_W)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return height
}

/** Keeps a dragged device on the canvas — off the edge it is clipped and lost. */
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

export type Tool = 'select' | 'cable' | 'wifi'

/**
 * Where the green ports sit on a hovered device: the four corners and the
 * middle of each edge, so there is always one near wherever the pointer is.
 */
const HALF = NODE / 2
const PORTS: ReadonlyArray<readonly [number, number]> = [
  [-HALF, -HALF], [0, -HALF], [HALF, -HALF],
  [-HALF, 0], [HALF, 0],
  [-HALF, HALF], [0, HALF], [HALF, HALF],
]

/**
 * The drawing surface. SVG rather than canvas: twenty-odd nodes, and hit
 * testing, focus and text come for free.
 *
 * Two ways to link. Hovering a device shows green ports; dragging one onto
 * another device lays a cable (or WLAN, with that tool active) in one go.
 * The older two-click way stays for the link tools — it's more forgiving on
 * a school trackpad, and a tablet has no hover at all, which is also why a
 * *selected* device shows its ports too.
 */
export function Canvas({
  plan,
  tool,
  selectedId,
  linkFromId,
  faultyIds,
  onSelect,
  onMove,
  onDeviceClick,
  onBackgroundClick,
  onLink,
}: {
  plan: Plan
  tool: Tool
  selectedId: string | null
  linkFromId: string | null
  faultyIds: Set<string>
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  onDeviceClick: (id: string) => void
  onBackgroundClick: () => void
  onLink: (fromId: string, toId: string, medium: Medium) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const viewH = useViewHeight(svgRef)
  const [dragging, setDragging] = useState<
    { id: string; dx: number; dy: number; startX: number; startY: number } | null
  >(null)
  const [moved, setMoved] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  /** A cable being pulled from a port: where it's from, and where the pointer is. */
  const [wiring, setWiring] = useState<
    { fromId: string; x: number; y: number; overId: string | null } | null
  >(null)
  // The click that follows a port drag lands on the <svg> (the common ancestor
  // of the port and the device it was dropped on) and would read as a
  // background click, deselecting everything the moment the cable is laid.
  const justWired = useRef(false)

  const medium: Medium = tool === 'wifi' ? 'wifi' : 'cable'

  function deviceAt(x: number, y: number): Device | undefined {
    return plan.devices.find((d) => Math.abs(d.x - x) <= HALF && Math.abs(d.y - y) <= HALF)
  }

  function startWiring(e: React.PointerEvent<SVGCircleElement>, d: Device) {
    // Not a device drag — the port is inside the device's <g>.
    e.stopPropagation()
    e.preventDefault()
    const p = toSvgPoint(e)
    setWiring({ fromId: d.id, x: p.x, y: p.y, overId: null })
  }

  function endWiring(e: React.PointerEvent) {
    if (!wiring) return
    const p = toSvgPoint(e)
    const target = deviceAt(p.x, p.y)
    if (target && target.id !== wiring.fromId) {
      onLink(wiring.fromId, target.id, medium)
      justWired.current = true
    }
    setWiring(null)
  }

  function toSvgPoint(e: { clientX: number; clientY: number }) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    return {
      x: ((e.clientX - rect.left) / rect.width) * vb.width,
      y: ((e.clientY - rect.top) / rect.height) * vb.height,
    }
  }

  /**
   * Dragging works in every tool, not just "Auswählen" — a student laying
   * cables still wants to tidy the layout without switching back and forth.
   * A click and a drag are told apart by distance travelled, so a wobbly
   * trackpad press still registers as a click and starts a link.
   */
  function startDrag(e: React.PointerEvent<SVGGElement>, d: Device) {
    const p = toSvgPoint(e)
    setDragging({ id: d.id, dx: p.x - d.x, dy: p.y - d.y, startX: p.x, startY: p.y })
    setMoved(false)
    // Without this the browser starts selecting the SVG labels the drag
    // passes over. Focus is restored by hand, since preventDefault drops it.
    e.preventDefault()
    e.currentTarget.focus()
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (wiring) {
      const p = toSvgPoint(e)
      const over = deviceAt(p.x, p.y)
      setWiring({
        ...wiring,
        x: p.x,
        y: p.y,
        overId: over && over.id !== wiring.fromId ? over.id : null,
      })
      return
    }
    if (!dragging) return
    const p = toSvgPoint(e)
    if (!moved && Math.hypot(p.x - dragging.startX, p.y - dragging.startY) < DRAG_THRESHOLD) {
      return
    }
    setMoved(true)
    const half = NODE / 2
    onMove(
      dragging.id,
      Math.round(clamp(p.x - dragging.dx, half, VIEW_W - half)),
      // Extra room at the bottom for the name and IP printed under the box.
      Math.round(clamp(p.y - dragging.dy, half, viewH - half - 24)),
    )
  }

  return (
    <svg
      ref={svgRef}
      className={`canvas tool-${tool}`}
      viewBox={`0 0 ${VIEW_W} ${viewH}`}
      preserveAspectRatio="xMidYMid meet"
      role="application"
      aria-label="Netzwerkplan"
      onPointerMove={onPointerMove}
      onPointerUp={(e) => {
        setDragging(null)
        endWiring(e)
      }}
      onPointerLeave={() => {
        setDragging(null)
        setWiring(null)
      }}
      onClick={(e) => {
        if (justWired.current) {
          justWired.current = false
          return
        }
        if (e.target === svgRef.current) {
          onSelect(null)
          onBackgroundClick()
        }
      }}
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="var(--line)" strokeWidth="1" opacity=".5" />
        </pattern>
      </defs>
      <rect width={VIEW_W} height={viewH} fill="url(#grid)" />

      {plan.links.map((l) => {
        const a = deviceById(plan, l.from)
        const b = deviceById(plan, l.to)
        if (!a || !b) return null
        return (
          <line
            key={l.id}
            className={`wire wire-${l.medium}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
          />
        )
      })}

      {wiring && (() => {
        const from = deviceById(plan, wiring.fromId)
        if (!from) return null
        const to = wiring.overId ? deviceById(plan, wiring.overId) : undefined
        return (
          <line
            className={`wire wire-${medium} wire-draft`}
            x1={from.x}
            y1={from.y}
            x2={to ? to.x : wiring.x}
            y2={to ? to.y : wiring.y}
          />
        )
      })()}

      {plan.devices.map((d) => {
        const spec = DEVICES[d.type]
        const state = [
          d.id === selectedId ? 'sel' : '',
          d.id === linkFromId ? 'linking' : '',
          faultyIds.has(d.id) ? 'faulty' : '',
          wiring?.overId === d.id ? 'drop' : '',
        ]
          .filter(Boolean)
          .join(' ')
        const showPorts =
          !dragging && !wiring && (hoverId === d.id || selectedId === d.id)
        return (
          <g
            key={d.id}
            className={`node ${state}`}
            transform={`translate(${d.x} ${d.y})`}
            tabIndex={0}
            role="button"
            aria-label={`${spec.label} ${d.name}`}
            onPointerEnter={() => setHoverId(d.id)}
            onPointerLeave={() => setHoverId((h) => (h === d.id ? null : h))}
            onPointerDown={(e) => startDrag(e, d)}
            onClick={(e) => {
              e.stopPropagation()
              if (justWired.current) {
                justWired.current = false
                return
              }
              // A drag should not also count as a click.
              if (moved) return
              onSelect(d.id)
              onDeviceClick(d.id)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(d.id)
                onDeviceClick(d.id)
              }
            }}
          >
            <rect
              className="node-box"
              x={-NODE / 2}
              y={-NODE / 2}
              width={NODE}
              height={NODE}
              rx="12"
            />
            <g className="node-icon" transform="translate(-17 -22) scale(1.45)">
              <DeviceIcon type={d.type} />
            </g>
            <text className="node-label" y={NODE / 2 + 15} textAnchor="middle">
              {d.name}
            </text>
            {d.ip && (
              <text className="node-ip" y={NODE / 2 + 29} textAnchor="middle">
                {d.ip}
              </text>
            )}
            {showPorts &&
              PORTS.map(([px, py]) => (
                <circle
                  key={`${px},${py}`}
                  className="port"
                  cx={px}
                  cy={py}
                  r={6}
                  onPointerDown={(e) => startWiring(e, d)}
                />
              ))}
          </g>
        )
      })}
    </svg>
  )
}

export const MEDIUM_LABEL: Record<Medium, string> = {
  cable: 'Kabel',
  wifi: 'WLAN',
}
