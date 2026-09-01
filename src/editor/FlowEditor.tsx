import { useCallback, useMemo, useState } from 'react'
import {
  FLOW_KINDS,
  type Flow,
  type FlowKind,
  makeNode,
  newFlowId,
  nodeById,
  outgoing,
  removeNode,
  whyCannotConnect,
} from '../model/flow'
import type { Finding } from '../model/rules'
import { FlowCanvas, type FlowTool } from './FlowCanvas'

const KINDS: FlowKind[] = ['start', 'process', 'decision', 'end']

export function FlowEditor({
  flow,
  onChange,
  findings,
}: {
  flow: Flow
  onChange: (next: Flow) => void
  findings: Finding[]
}) {
  const [tool, setTool] = useState<FlowTool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [connectFromId, setConnectFromId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const faultyIds = useMemo(
    () => new Set(findings.flatMap((f) => f.deviceIds)),
    [findings],
  )

  const addNode = useCallback(
    (kind: FlowKind) => {
      // Straight down the middle: flowcharts read top to bottom, and a single
      // column keeps the arrows from crossing before the student rearranges.
      const n = flow.nodes.length
      const node = makeNode(kind, 400, 70 + n * 88)
      onChange({ ...flow, nodes: [...flow.nodes, node] })
      setSelectedId(node.id)
      setSelectedEdgeId(null)
      setNotice(null)
    },
    [flow, onChange],
  )

  const handleNodeClick = useCallback(
    (id: string) => {
      if (tool !== 'connect') return
      if (!connectFromId) {
        setConnectFromId(id)
        setNotice(null)
        return
      }
      if (connectFromId === id) {
        setConnectFromId(null)
        return
      }
      const from = nodeById(flow, connectFromId)
      const to = nodeById(flow, id)
      if (!from || !to) return
      const problem = whyCannotConnect(flow, from, to)
      if (problem) {
        setNotice(problem)
        setConnectFromId(null)
        return
      }
      // A decision's two exits are Ja then Nein, so they are never unlabelled.
      const label =
        from.kind === 'decision'
          ? outgoing(flow, from.id).length === 0
            ? 'Ja'
            : 'Nein'
          : undefined
      onChange({
        ...flow,
        edges: [...flow.edges, { id: newFlowId('edge'), from: from.id, to: to.id, label }],
      })
      setConnectFromId(null)
      setNotice(null)
    },
    [tool, connectFromId, flow, onChange],
  )

  const selected = selectedId ? (nodeById(flow, selectedId) ?? null) : null
  const selectedEdge = flow.edges.find((e) => e.id === selectedEdgeId) ?? null

  return (
    <div className="editor">
      <div className="toolbar">
        <button
          className={tool === 'select' ? 'tool on' : 'tool'}
          aria-pressed={tool === 'select'}
          onClick={() => {
            setTool('select')
            setConnectFromId(null)
            setNotice(null)
          }}
        >
          Auswählen
        </button>
        <button
          className={tool === 'connect' ? 'tool on' : 'tool'}
          aria-pressed={tool === 'connect'}
          onClick={() => {
            setTool('connect')
            setConnectFromId(null)
            setNotice(null)
          }}
        >
          Pfeil ziehen
        </button>
        <span className="toolbar-hint">
          {tool === 'select'
            ? 'Symbole anklicken, verschieben und beschriften.'
            : connectFromId
              ? `Klick jetzt das Ziel an — von ${nodeById(flow, connectFromId)?.text} aus.`
              : 'Klick zwei Symbole nacheinander an, um einen Pfeil zu ziehen.'}
        </span>
      </div>

      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}

      <div className="editor-body">
        <div className="palette">
          <section>
            <h3>Symbole</h3>
            <div className="palette-items">
              {KINDS.map((k) => (
                <button
                  key={k}
                  className="pal-item"
                  title={FLOW_KINDS[k].erklaerung}
                  onClick={() => addNode(k)}
                >
                  <span className={`sym sym-${k}`} aria-hidden="true" />
                  <span>{FLOW_KINDS[k].label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <FlowCanvas
          flow={flow}
          tool={tool}
          selectedId={selectedId}
          connectFromId={connectFromId}
          selectedEdgeId={selectedEdgeId}
          faultyIds={faultyIds}
          onSelect={setSelectedId}
          onSelectEdge={setSelectedEdgeId}
          onMove={(id, x, y) =>
            onChange({
              ...flow,
              nodes: flow.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
            })
          }
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => setConnectFromId(null)}
        />

        <aside className="inspector">
          {selectedEdge ? (
            <>
              <div className="insp-head">
                <strong>Pfeil</strong>
              </div>
              <p className="insp-funktion">
                {nodeById(flow, selectedEdge.from)?.text} → {nodeById(flow, selectedEdge.to)?.text}
              </p>
              <label htmlFor="edge-label">Beschriftung</label>
              <div className="row branch-row">
                {['Ja', 'Nein', ''].map((v) => (
                  <button
                    key={v || 'none'}
                    className={selectedEdge.label === (v || undefined) ? 'tool on' : 'tool'}
                    onClick={() =>
                      onChange({
                        ...flow,
                        edges: flow.edges.map((e) =>
                          e.id === selectedEdge.id ? { ...e, label: v || undefined } : e,
                        ),
                      })
                    }
                  >
                    {v || 'ohne'}
                  </button>
                ))}
              </div>
              <button
                className="ghost danger"
                onClick={() => {
                  onChange({ ...flow, edges: flow.edges.filter((e) => e.id !== selectedEdge.id) })
                  setSelectedEdgeId(null)
                }}
              >
                Pfeil löschen
              </button>
            </>
          ) : selected ? (
            <>
              <div className="insp-head">
                <span className={`sym sym-${selected.kind}`} aria-hidden="true" />
                <strong>{FLOW_KINDS[selected.kind].label}</strong>
              </div>
              <p className="insp-funktion">{FLOW_KINDS[selected.kind].erklaerung}</p>

              {FLOW_KINDS[selected.kind].editableText ? (
                <>
                  <label htmlFor="fnode-text">Beschriftung</label>
                  <textarea
                    id="fnode-text"
                    rows={2}
                    value={selected.text}
                    onChange={(e) =>
                      onChange({
                        ...flow,
                        nodes: flow.nodes.map((n) =>
                          n.id === selected.id ? { ...n, text: e.target.value } : n,
                        ),
                      })
                    }
                  />
                </>
              ) : (
                <p className="insp-noip">
                  Start und Ende heißen immer so — sie brauchen keinen eigenen Text.
                </p>
              )}

              <div className="insp-links">
                <h4>
                  Pfeile hinaus ({outgoing(flow, selected.id).length} von{' '}
                  {FLOW_KINDS[selected.kind].maxOut})
                </h4>
                {outgoing(flow, selected.id).length === 0 ? (
                  <p className="muted">Noch keiner.</p>
                ) : (
                  <ul>
                    {outgoing(flow, selected.id).map((e) => (
                      <li key={e.id}>
                        <span className="grow">
                          {e.label ? `${e.label} → ` : '→ '}
                          {nodeById(flow, e.to)?.text}
                        </span>
                        <button
                          className="link danger"
                          onClick={() =>
                            onChange({
                              ...flow,
                              edges: flow.edges.filter((x) => x.id !== e.id),
                            })
                          }
                        >
                          löschen
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                className="ghost danger"
                onClick={() => {
                  onChange(removeNode(flow, selected.id))
                  setSelectedId(null)
                }}
              >
                Symbol löschen
              </button>
            </>
          ) : (
            <div className="inspector empty">
              <p>
                Klick ein Symbol an, um es zu beschriften oder zu löschen. Einen Pfeil kannst du
                auch direkt anklicken.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
