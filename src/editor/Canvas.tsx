import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DEVICES, type Device, type Medium, type Plan, deviceById } from '../model/plan'
import { DeviceIcon } from './icons'

export const NODE = 64

/** How far the pointer may travel before a press counts as a drag, not a click. */
const DRAG_THRESHOLD = 5

/** Spacing of the background grid; device centres snap to its crossings. */
export const GRID = 20
export const snap = (v: number) => Math.round(v / GRID) * GRID

/*
 * At zoom 100 % the canvas shows 900 units across, whatever the pane's width.
 *
 * Width stays fixed so saved coordinates keep their meaning; the height follows
 * the pane, but never below 560, so a network drawn on a tall screen still
 * opens on a short one. Beyond that the drawing is as large as its devices
 * need — drag one past the edge and the canvas grows and scrolls (#6).
 */
const VIEW_W = 900
const VIEW_H_MIN = 560
/** Room kept free past the right-most and lowest device, so there's space to grow into. */
const GROW_MARGIN = 160

export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 2

/** Tracks the scroll pane's inner size in pixels. */
function usePaneSize(ref: React.RefObject<HTMLDivElement | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect
      if (!box || box.width === 0) return
      setSize({ w: box.width, h: box.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return size
}

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

/** The nearest grid line at which a whole device box is still on the canvas. */
const MIN_POS = Math.ceil(HALF / GRID) * GRID

export type Positions = Record<string, { x: number; y: number }>

/**
 * The drawing surface. SVG rather than canvas: twenty-odd nodes, and hit
 * testing, focus and text come for free.
 *
 * Two ways to link. Hovering a device shows green ports; dragging one onto
 * another device lays a cable (or WLAN, with that tool active) in one go.
 * The older two-click way stays for the link tools — it's more forgiving on
 * a school trackpad, and a tablet has no hover at all, which is also why a
 * *selected* device shows its ports too.
 *
 * Several devices can be selected — Shift-click, or a box dragged over the
 * empty canvas — and then move together (#4). Dragging any of them back onto
 * the palette deletes them (#3).
 */
export function Canvas({
  plan,
  tool,
  zoom,
  selectedIds,
  linkFromId,
  faultyIds,
  onSelect,
  onMove,
  onDeviceClick,
  onBackgroundClick,
  onLink,
  onRemoveLink,
  onZoom,
  isOverTrash,
  onTrashHover,
  onTrash,
}: {
  plan: Plan
  tool: Tool
  zoom: number
  selectedIds: string[]
  linkFromId: string | null
  faultyIds: Set<string>
  onSelect: (ids: string[]) => void
  onMove: (positions: Positions) => void
  onDeviceClick: (id: string) => void
  onBackgroundClick: () => void
  onLink: (fromId: string, toId: string, medium: Medium) => void
  onRemoveLink: (linkId: string) => void
  onZoom: (next: number) => void
  /** Is this screen point over the place a dragged device is thrown away? */
  isOverTrash: (clientX: number, clientY: number) => boolean
  onTrashHover: (over: boolean) => void
  onTrash: (ids: string[]) => void
}) {
  const paneRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pane = usePaneSize(paneRef)

  const [dragging, setDragging] = useState<
    { ids: string[]; origin: Positions; startX: number; startY: number } | null
  >(null)
  const [moved, setMoved] = useState(false)
  const [overTrash, setOverTrash] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [hoverLinkId, setHoverLinkId] = useState<string | null>(null)
  const hideLinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** A box being pulled open over the empty canvas, in drawing units. */
  const [marquee, setMarquee] = useState<
    { x0: number; y0: number; x: number; y: number; additive: boolean } | null
  >(null)
  /** A cable being pulled from a port: where it's from, and where the pointer is. */
  const [wiring, setWiring] = useState<
    { fromId: string; x: number; y: number; overId: string | null } | null
  >(null)
  // The click that follows a port drag can land on the device it was dropped
  // on and would read as a click on that device.
  const justWired = useRef(false)
  /** Was Shift (or Cmd/Ctrl) held when the current press on a device began? */
  const additivePress = useRef(false)

  const medium: Medium = tool === 'wifi' ? 'wifi' : 'cable'
  const selected = new Set(selectedIds)

  // Pixels per drawing unit, and how big the drawing is: at least the pane,
  // at least the classic 900 x 560, and always enough to hold every device.
  const scale = ((pane.w || VIEW_W) / VIEW_W) * zoom
  const right = Math.max(0, ...plan.devices.map((d) => d.x + HALF))
  const bottom = Math.max(0, ...plan.devices.map((d) => d.y + HALF + 30))
  const worldW = Math.max(
    VIEW_W,
    (pane.w || VIEW_W) / scale,
    right > VIEW_W ? right + GROW_MARGIN : 0,
  )
  const minH = Math.max(VIEW_H_MIN, (pane.h || VIEW_H_MIN) / scale)
  const worldH = Math.max(minH, bottom > minH ? bottom + GROW_MARGIN : 0)

  // Ctrl/Cmd + wheel (and a trackpad pinch, which browsers report the same
  // way) zooms instead of scrolling the page. Needs a non-passive listener,
  // which React's onWheel is not.
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  useEffect(() => {
    const el = paneRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const next = zoomRef.current * (e.deltaY < 0 ? 1.1 : 1 / 1.1)
      onZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onZoom])

  function deviceAt(x: number, y: number): Device | undefined {
    return plan.devices.find((d) => Math.abs(d.x - x) <= HALF && Math.abs(d.y - y) <= HALF)
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

  /**
   * Dragging works in every tool, not just "Auswählen" — a student laying
   * cables still wants to tidy the layout without switching back and forth.
   * A click and a drag are told apart by distance travelled, so a wobbly
   * trackpad press still registers as a click and starts a link.
   *
   * Pressing a device that is part of the selection drags the whole
   * selection; pressing any other drags just that one.
   */
  function startDrag(e: React.PointerEvent<SVGGElement>, d: Device) {
    const p = toSvgPoint(e)
    const ids = selected.has(d.id) ? selectedIds : [d.id]
    const origin: Positions = {}
    for (const id of ids) {
      const dev = deviceById(plan, id)
      if (dev) origin[id] = { x: dev.x, y: dev.y }
    }
    additivePress.current = e.shiftKey || e.metaKey || e.ctrlKey
    setDragging({ ids, origin, startX: p.x, startY: p.y })
    setMoved(false)
    // Without this the browser starts selecting the SVG labels the drag
    // passes over. Focus is restored by hand, since preventDefault drops it.
    e.preventDefault()
    e.currentTarget.focus()
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function startMarquee(e: React.PointerEvent<SVGElement>) {
    if (e.button !== 0) return
    const p = toSvgPoint(e)
    setMarquee({
      x0: p.x,
      y0: p.y,
      x: p.x,
      y: p.y,
      additive: e.shiftKey || e.metaKey || e.ctrlKey,
    })
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
    if (marquee) {
      const p = toSvgPoint(e)
      setMarquee({ ...marquee, x: p.x, y: p.y })
      return
    }
    if (!dragging) return
    const p = toSvgPoint(e)
    if (!moved && Math.hypot(p.x - dragging.startX, p.y - dragging.startY) < DRAG_THRESHOLD) {
      return
    }
    setMoved(true)

    const trash = isOverTrash(e.clientX, e.clientY)
    if (trash !== overTrash) {
      setOverTrash(trash)
      onTrashHover(trash)
    }

    // The whole group shifts by the same amount, held back only so far that
    // its top-left device stays on the canvas; every centre lands on the grid.
    const origins = Object.values(dragging.origin)
    const minX = Math.min(...origins.map((o) => o.x))
    const minY = Math.min(...origins.map((o) => o.y))
    const dx = Math.max(p.x - dragging.startX, MIN_POS - minX)
    const dy = Math.max(p.y - dragging.startY, MIN_POS - minY)
    const next: Positions = {}
    let changed = false
    for (const [id, o] of Object.entries(dragging.origin)) {
      const x = Math.max(MIN_POS, snap(o.x + dx))
      const y = Math.max(MIN_POS, snap(o.y + dy))
      next[id] = { x, y }
      const now = deviceById(plan, id)
      if (!now || now.x !== x || now.y !== y) changed = true
    }
    if (changed) onMove(next)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (dragging && moved && overTrash) onTrash(dragging.ids)
    if (overTrash) {
      setOverTrash(false)
      onTrashHover(false)
    }
    setDragging(null)
    endWiring(e)

    if (marquee) {
      const wide = Math.hypot(marquee.x - marquee.x0, marquee.y - marquee.y0) >= DRAG_THRESHOLD
      if (wide && tool === 'select') {
        const [x1, x2] = [Math.min(marquee.x0, marquee.x), Math.max(marquee.x0, marquee.x)]
        const [y1, y2] = [Math.min(marquee.y0, marquee.y), Math.max(marquee.y0, marquee.y)]
        const inside = plan.devices
          .filter((d) => d.x >= x1 && d.x <= x2 && d.y >= y1 && d.y <= y2)
          .map((d) => d.id)
        onSelect(marquee.additive ? [...new Set([...selectedIds, ...inside])] : inside)
      } else if (!wide) {
        // A plain click on the empty canvas.
        onSelect([])
        onBackgroundClick()
      }
      setMarquee(null)
    }
  }

  function showLinkControl(id: string) {
    if (hideLinkTimer.current) clearTimeout(hideLinkTimer.current)
    setHoverLinkId(id)
  }

  /**
   * Delayed, so the pointer can travel from the cable onto its delete button
   * — which sits on top of the cable, so the cable reports a leave first.
   */
  function hideLinkControl() {
    if (hideLinkTimer.current) clearTimeout(hideLinkTimer.current)
    hideLinkTimer.current = setTimeout(() => setHoverLinkId(null), 200)
  }

  const busy = Boolean(dragging || wiring || marquee)
  const hoveredLink = hoverLinkId && !busy ? plan.links.find((l) => l.id === hoverLinkId) : undefined

  return (
    <div
      ref={paneRef}
      className={`canvas-pane${overTrash ? ' trashing' : ''}`}
    >
      <svg
        ref={svgRef}
        className={`canvas tool-${tool}`}
        viewBox={`0 0 ${worldW} ${worldH}`}
        width={worldW * scale}
        height={worldH * scale}
        role="application"
        aria-label="Netzwerkplan"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          setDragging(null)
          setWiring(null)
          setMarquee(null)
        }}
        onPointerDown={(e) => {
          if (e.target === svgRef.current) startMarquee(e)
        }}
      >
        <defs>
          <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <path
              d={`M${GRID} 0H0V${GRID}`}
              fill="none"
              stroke="var(--line)"
              strokeWidth="1"
              opacity=".5"
            />
          </pattern>
        </defs>
        <rect
          className="canvas-bg"
          width={worldW}
          height={worldH}
          fill="url(#grid)"
          onPointerDown={startMarquee}
        />

        {plan.links.map((l) => {
          const a = deviceById(plan, l.from)
          const b = deviceById(plan, l.to)
          if (!a || !b) return null
          return (
            <g
              key={l.id}
              onPointerEnter={() => !busy && showLinkControl(l.id)}
              onPointerLeave={hideLinkControl}
            >
              <line
                className={`wire wire-${l.medium}${hoveredLink?.id === l.id ? ' wire-hover' : ''}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              />
              {/* A wide invisible twin, so the cable is easy to hit (#3). */}
              <line
                className="wire-hit"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                onPointerDown={(e) => {
                  // A tap on a tablet has no hover — it shows the button instead.
                  e.stopPropagation()
                  showLinkControl(l.id)
                }}
              />
            </g>
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
            selected.has(d.id) ? 'sel' : '',
            d.id === linkFromId ? 'linking' : '',
            faultyIds.has(d.id) ? 'faulty' : '',
            wiring?.overId === d.id ? 'drop' : '',
            overTrash && dragging?.ids.includes(d.id) ? 'trash' : '',
          ]
            .filter(Boolean)
            .join(' ')
          const showPorts =
            !busy &&
            (hoverId === d.id || (selectedIds.length === 1 && selectedIds[0] === d.id))
          return (
            <g
              key={d.id}
              className={`node ${state}`}
              transform={`translate(${d.x} ${d.y})`}
              tabIndex={0}
              role="button"
              aria-label={`${spec.label} ${d.name}`}
              aria-pressed={selected.has(d.id)}
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
                if (additivePress.current) {
                  onSelect(
                    selected.has(d.id)
                      ? selectedIds.filter((id) => id !== d.id)
                      : [...selectedIds, d.id],
                  )
                  return
                }
                onSelect([d.id])
                onDeviceClick(d.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect([d.id])
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

        {/* Drawn last so no device box covers it. */}
        {hoveredLink && (() => {
          const a = deviceById(plan, hoveredLink.from)
          const b = deviceById(plan, hoveredLink.to)
          if (!a || !b) return null
          return (
            <g
              className="wire-delete"
              transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})`}
              role="button"
              tabIndex={0}
              aria-label={`Verbindung ${a.name} – ${b.name} löschen`}
              onPointerEnter={() => showLinkControl(hoveredLink.id)}
              onPointerLeave={hideLinkControl}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onRemoveLink(hoveredLink.id)
                setHoverLinkId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onRemoveLink(hoveredLink.id)
                  setHoverLinkId(null)
                }
              }}
            >
              <title>Verbindung löschen</title>
              <circle r={11} />
              <path d="M-4 -4L4 4M4 -4L-4 4" />
            </g>
          )
        })()}

        {marquee && tool === 'select' && (
          <rect
            className="marquee"
            x={Math.min(marquee.x0, marquee.x)}
            y={Math.min(marquee.y0, marquee.y)}
            width={Math.abs(marquee.x - marquee.x0)}
            height={Math.abs(marquee.y - marquee.y0)}
          />
        )}
      </svg>
    </div>
  )
}

export const MEDIUM_LABEL: Record<Medium, string> = {
  cable: 'Kabel',
  wifi: 'WLAN',
}
