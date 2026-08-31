import { useRef, useState } from 'react'
import { DEVICES, type Device, type Medium, type Plan, deviceById } from '../model/plan'
import { DeviceIcon } from './icons'

export const NODE = 64

export type Tool = 'select' | 'cable' | 'wifi'

/**
 * The drawing surface. SVG rather than canvas: twenty-odd nodes, and hit
 * testing, focus and text come for free.
 *
 * Linking is two clicks rather than a drag — far more forgiving on a school
 * trackpad, and it lets a refused link explain itself instead of just snapping
 * back.
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
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number } | null>(null)
  const [moved, setMoved] = useState(false)

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

  function startDrag(e: React.PointerEvent, d: Device) {
    if (tool !== 'select') return
    const p = toSvgPoint(e)
    setDragging({ id: d.id, dx: p.x - d.x, dy: p.y - d.y })
    setMoved(false)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const p = toSvgPoint(e)
    setMoved(true)
    onMove(dragging.id, Math.round(p.x - dragging.dx), Math.round(p.y - dragging.dy))
  }

  return (
    <svg
      ref={svgRef}
      className={`canvas tool-${tool}`}
      viewBox="0 0 900 560"
      role="application"
      aria-label="Netzwerkplan"
      onPointerMove={onPointerMove}
      onPointerUp={() => setDragging(null)}
      onPointerLeave={() => setDragging(null)}
      onClick={(e) => {
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
      <rect width="900" height="560" fill="url(#grid)" />

      {plan.links.map((l) => {
        const a = deviceById(plan, l.from)
        const b = deviceById(plan, l.to)
        if (!a || !b) return null
        return (
          <line
            key={l.id}
            className={`link link-${l.medium}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
          />
        )
      })}

      {plan.devices.map((d) => {
        const spec = DEVICES[d.type]
        const state = [
          d.id === selectedId ? 'sel' : '',
          d.id === linkFromId ? 'linking' : '',
          faultyIds.has(d.id) ? 'faulty' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <g
            key={d.id}
            className={`node ${state}`}
            transform={`translate(${d.x} ${d.y})`}
            tabIndex={0}
            role="button"
            aria-label={`${spec.label} ${d.name}`}
            onPointerDown={(e) => startDrag(e, d)}
            onClick={(e) => {
              e.stopPropagation()
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
