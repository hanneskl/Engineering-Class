import { useRef, useState } from 'react'
import { type Flow, type FlowNode, nodeById } from '../model/flow'

const DRAG_THRESHOLD = 5
const W = 158
const H = 58
/** Decisions are wide and flat: their text is a question, not one verb. */
const DW = 176
const DH = 96
const LINE = 14

/** Greedy wrap so a label sits inside its shape instead of spilling over it. */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    }
  }
  if (lines.length < maxLines && current) lines.push(current)
  if (lines.length === maxLines && current && lines[maxLines - 1] !== current) {
    lines[maxLines - 1] = `${lines[maxLines - 1]!.slice(0, maxChars - 1)}…`
  }
  return lines.length ? lines : ['']
}

export type FlowTool = 'select' | 'connect'

/** Where an arrow should touch a symbol, given the direction it comes from. */
function anchor(n: FlowNode, towardX: number, towardY: number) {
  const dx = towardX - n.x
  const dy = towardY - n.y
  if (n.kind === 'decision') {
    // Diamond: step out along whichever axis dominates.
    return Math.abs(dx) * DH > Math.abs(dy) * DW
      ? { x: n.x + Math.sign(dx) * (DW / 2), y: n.y }
      : { x: n.x, y: n.y + Math.sign(dy) * (DH / 2) }
  }
  const halfW = W / 2
  const halfH = H / 2
  if (Math.abs(dy) * halfW > Math.abs(dx) * halfH) {
    return { x: n.x + (dy === 0 ? 0 : (dx / Math.abs(dy)) * halfH), y: n.y + Math.sign(dy) * halfH }
  }
  return { x: n.x + Math.sign(dx) * halfW, y: n.y + (dx === 0 ? 0 : (dy / Math.abs(dx)) * halfW) }
}

export function FlowCanvas({
  flow,
  tool,
  selectedId,
  connectFromId,
  selectedEdgeId,
  faultyIds,
  onSelect,
  onSelectEdge,
  onMove,
  onNodeClick,
  onBackgroundClick,
}: {
  flow: Flow
  tool: FlowTool
  selectedId: string | null
  connectFromId: string | null
  selectedEdgeId: string | null
  faultyIds: Set<string>
  onSelect: (id: string | null) => void
  onSelectEdge: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  onNodeClick: (id: string) => void
  onBackgroundClick: () => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<
    { id: string; dx: number; dy: number; startX: number; startY: number } | null
  >(null)
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

  function startDrag(e: React.PointerEvent, n: FlowNode) {
    const p = toSvgPoint(e)
    setDragging({ id: n.id, dx: p.x - n.x, dy: p.y - n.y, startX: p.x, startY: p.y })
    setMoved(false)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  return (
    <svg
      ref={svgRef}
      className={`canvas flow-canvas tool-${tool}`}
      viewBox="0 0 900 620"
      role="application"
      aria-label="Flussdiagramm"
      onPointerMove={(e) => {
        if (!dragging) return
        const p = toSvgPoint(e)
        if (!moved && Math.hypot(p.x - dragging.startX, p.y - dragging.startY) < DRAG_THRESHOLD) {
          return
        }
        setMoved(true)
        onMove(dragging.id, Math.round(p.x - dragging.dx), Math.round(p.y - dragging.dy))
      }}
      onPointerUp={() => setDragging(null)}
      onPointerLeave={() => setDragging(null)}
      onClick={(e) => {
        if (e.target === svgRef.current) {
          onSelect(null)
          onSelectEdge(null)
          onBackgroundClick()
        }
      }}
    >
      <defs>
        <pattern id="flowgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="var(--line)" strokeWidth="1" opacity=".5" />
        </pattern>
        <marker
          id="arrowhead"
          markerWidth="9"
          markerHeight="7"
          refX="8"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 9 3.5, 0 7" fill="var(--muted)" />
        </marker>
      </defs>
      <rect width="900" height="620" fill="url(#flowgrid)" />

      {flow.edges.map((e) => {
        const a = nodeById(flow, e.from)
        const b = nodeById(flow, e.to)
        if (!a || !b) return null
        const p1 = anchor(a, b.x, b.y)
        const p2 = anchor(b, a.x, a.y)
        return (
          <g key={e.id} className={e.id === selectedEdgeId ? 'edge sel' : 'edge'}>
            <line
              className="edge-hit"
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              onClick={(ev) => {
                ev.stopPropagation()
                onSelectEdge(e.id)
                onSelect(null)
              }}
            />
            <line
              className="edge-line"
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              markerEnd="url(#arrowhead)"
            />
            {e.label && (
              <text
                className="edge-label"
                x={(p1.x + p2.x) / 2}
                y={(p1.y + p2.y) / 2 - 6}
                textAnchor="middle"
              >
                {e.label}
              </text>
            )}
          </g>
        )
      })}

      {flow.nodes.map((n) => {
        const state = [
          n.id === selectedId ? 'sel' : '',
          n.id === connectFromId ? 'linking' : '',
          faultyIds.has(n.id) ? 'faulty' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <g
            key={n.id}
            className={`fnode fnode-${n.kind} ${state}`}
            transform={`translate(${n.x} ${n.y})`}
            tabIndex={0}
            role="button"
            aria-label={`${n.kind}: ${n.text}`}
            onPointerDown={(e) => startDrag(e, n)}
            onClick={(e) => {
              e.stopPropagation()
              if (moved) return
              onSelect(n.id)
              onSelectEdge(null)
              onNodeClick(n.id)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(n.id)
                onNodeClick(n.id)
              }
            }}
          >
            {n.kind === 'decision' ? (
              <polygon
                className="fnode-shape"
                points={`0,${-DH / 2} ${DW / 2},0 0,${DH / 2} ${-DW / 2},0`}
              />
            ) : (
              <rect
                className="fnode-shape"
                x={-W / 2}
                y={-H / 2}
                width={W}
                height={H}
                rx={n.kind === 'start' || n.kind === 'end' ? H / 2 : 8}
              />
            )}
            <text className="fnode-text" textAnchor="middle">
              {(() => {
                const lines = wrapText(n.text, n.kind === 'decision' ? 16 : 20, 2)
                const top = -((lines.length - 1) * LINE) / 2 + 4
                return lines.map((line, i) => (
                  <tspan key={i} x="0" y={top + i * LINE}>
                    {line}
                  </tspan>
                ))
              })()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
