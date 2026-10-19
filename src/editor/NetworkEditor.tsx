import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEVICES,
  type DeviceType,
  type Medium,
  type Plan,
  areLinked,
  deviceById,
  makeDevice,
  newId,
  removeDevice,
} from '../model/plan'
import { whyCannotLink, type Finding } from '../model/rules'
import { assignAddresses } from '../model/dhcp'
import { Canvas, MEDIUM_LABEL, ZOOM_MAX, ZOOM_MIN, type Positions, type Tool } from './Canvas'
import { Palette } from './Palette'
import { Inspector } from './Inspector'

const ROW_BY_GROUP = { aussen: 0, netz: 1, geraete: 2 } as const

const ZOOM_STEP = 0.25

/** Every listed device gone, with every cable that ended at one of them. */
function removeDevices(plan: Plan, ids: string[]): Plan {
  return ids.reduce(removeDevice, plan)
}

/** Typing in a field must never delete the device being edited. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}

/**
 * The drawing surface plus everything around it. Validation runs on every
 * change rather than behind a submit button (ARCHITECTURE.md §5, phase 4), so
 * a mistake is named while the student still remembers making it.
 */
export function NetworkEditor({
  plan,
  onChange,
  findings,
}: {
  plan: Plan
  onChange: (next: Plan) => void
  /** Everything currently wrong, computed by the caller; used for highlighting. */
  findings: Finding[]
}) {
  const [tool, setTool] = useState<Tool>('select')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [zoom, setZoom] = useState(1)
  const paletteRef = useRef<HTMLDivElement>(null)
  const [trashHover, setTrashHover] = useState(false)
  const [linkFromId, setLinkFromId] = useState<string | null>(null)
  /**
   * Transient notices disappear on their own; the ones explaining why a link
   * was refused stay, because that text is the teaching and a student may
   * still be reading it.
   */
  const [notice, setNotice] = useState<{ text: string; transient?: boolean } | null>(null)

  useEffect(() => {
    if (!notice?.transient) return
    const timer = setTimeout(() => setNotice(null), 3000)
    return () => clearTimeout(timer)
  }, [notice])

  const faultyIds = useMemo(
    () => new Set(findings.flatMap((f) => f.deviceIds)),
    [findings],
  )

  const addDevice = useCallback(
    (type: DeviceType) => {
      // Drop new devices in rows by role — outside world on top, network
      // gear in the middle, end devices at the bottom — the same order as
      // the palette and as the schematics in the Quali. One flat row would
      // put a switch and its PCs side by side, so every cable to the third
      // PC ran straight through the first two.
      const row = ROW_BY_GROUP[DEVICES[type].group]
      const taken = (x: number, y: number) =>
        plan.devices.some((d) => Math.abs(d.x - x) < 60 && Math.abs(d.y - y) < 60)
      // Walk the row's slots until a free one — a device the student dragged
      // (or one placed by the older flat layout) may already sit there.
      // Every slot sits on a grid crossing, like a dragged device would (#5).
      let slot = 0
      let x = 0
      let y = 0
      do {
        x = 120 + (slot % 6) * 140
        y = 80 + row * 160 + Math.floor(slot / 6) * 80
        slot += 1
      } while (taken(x, y) && slot < 18)
      const device = makeDevice(plan, type, x, y)
      onChange({ ...plan, devices: [...plan.devices, device] })
      setSelectedIds([device.id])
      setNotice(null)
    },
    [plan, onChange],
  )

  const tryLink = useCallback(
    (fromId: string, toId: string, medium: Medium) => {
      const a = deviceById(plan, fromId)
      const b = deviceById(plan, toId)
      if (!a || !b) return
      const problem = whyCannotLink(plan, a, b, medium)
      if (problem) {
        setNotice({ text: problem })
        return
      }
      onChange({
        ...plan,
        links: [...plan.links, { id: newId('link'), from: fromId, to: toId, medium }],
      })
      setNotice(null)
    },
    [plan, onChange],
  )

  const handleDeviceClick = useCallback(
    (id: string) => {
      if (tool === 'select') return
      const medium: Medium = tool === 'cable' ? 'cable' : 'wifi'
      if (!linkFromId) {
        setLinkFromId(id)
        setNotice(null)
        return
      }
      if (linkFromId === id) {
        setLinkFromId(null)
        return
      }
      tryLink(linkFromId, id, medium)
      setLinkFromId(null)
    },
    [tool, linkFromId, tryLink],
  )

  // Ids of devices that no longer exist (an undo, a reset) drop out here.
  const selection = selectedIds.filter((id) => deviceById(plan, id))
  const selected = selection.length === 1 ? (deviceById(plan, selection[0]!) ?? null) : null

  const removeSelected = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      onChange(removeDevices(plan, ids))
      setSelectedIds([])
      setLinkFromId(null)
    },
    [plan, onChange],
  )

  // Entf and the Backspace key delete whatever is selected; Esc lets go of it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.length === 0) return
        e.preventDefault()
        removeSelected(selection)
      } else if (e.key === 'Escape') {
        setSelectedIds([])
        setLinkFromId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection, removeSelected])

  const isOverTrash = useCallback((x: number, y: number) => {
    const box = paletteRef.current?.getBoundingClientRect()
    return Boolean(box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)
  }, [])

  const zoomTo = useCallback(
    (next: number) => setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))),
    [],
  )

  return (
    <div className="editor">
      <div className="toolbar">
        {(['select', 'cable', 'wifi'] as Tool[]).map((t) => (
          <button
            key={t}
            className={tool === t ? 'tool on' : 'tool'}
            aria-pressed={tool === t}
            onClick={() => {
              setTool(t)
              setLinkFromId(null)
              setNotice(null)
            }}
          >
            {t === 'select' ? 'Auswählen' : `Mit ${MEDIUM_LABEL[t as Medium]} verbinden`}
          </button>
        ))}
        <span className="toolbar-hint">
          {tool === 'select'
            ? 'Geräte anklicken und verschieben, mit Shift mehrere. Zum Verbinden ein Kabel vom grünen Punkt zum nächsten Gerät ziehen.'
            : linkFromId
              ? `Klick jetzt das zweite Gerät an — ${deviceById(plan, linkFromId)?.name} ist ausgewählt.`
              : 'Klick zwei Geräte nacheinander an, um sie zu verbinden.'}
        </span>
        <div className="zoom" role="group" aria-label="Zoom">
          <button
            className="tool"
            onClick={() => zoomTo(zoom - ZOOM_STEP)}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Verkleinern"
          >
            −
          </button>
          <button className="tool zoom-level" onClick={() => setZoom(1)} title="Zurück auf 100 %">
            {Math.round(zoom * 100)} %
          </button>
          <button
            className="tool"
            onClick={() => zoomTo(zoom + ZOOM_STEP)}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Vergrößern"
          >
            +
          </button>
        </div>
      </div>

      {notice && (
        <div className={`notice${notice.transient ? ' notice-ok' : ''}`} role="status">
          {notice.text}
        </div>
      )}

      <div className="editor-body">
        <Palette onAdd={addDevice} boxRef={paletteRef} trash={trashHover} />
        <Canvas
          plan={plan}
          tool={tool}
          zoom={zoom}
          selectedIds={selection}
          linkFromId={linkFromId}
          faultyIds={faultyIds}
          onLink={tryLink}
          onSelect={setSelectedIds}
          onMove={(positions: Positions) =>
            onChange({
              ...plan,
              devices: plan.devices.map((d) => (positions[d.id] ? { ...d, ...positions[d.id] } : d)),
            })
          }
          onDeviceClick={handleDeviceClick}
          onBackgroundClick={() => setLinkFromId(null)}
          onRemoveLink={(linkId) =>
            onChange({ ...plan, links: plan.links.filter((l) => l.id !== linkId) })
          }
          onZoom={zoomTo}
          isOverTrash={isOverTrash}
          onTrashHover={setTrashHover}
          onTrash={removeSelected}
        />
        {selection.length > 1 ? (
          <aside className="inspector">
            <p className="insp-multi">
              <strong>{selection.length} Geräte markiert.</strong> Zieh eins davon, um alle
              zusammen zu verschieben.
            </p>
            <button className="ghost danger" onClick={() => removeSelected(selection)}>
              Alle {selection.length} löschen
            </button>
          </aside>
        ) : (
        <Inspector
          plan={plan}
          device={selected}
          onRename={(id, name) =>
            onChange({
              ...plan,
              devices: plan.devices.map((d) => (d.id === id ? { ...d, name } : d)),
            })
          }
          onIp={(id, ip) =>
            onChange({
              ...plan,
              devices: plan.devices.map((d) =>
                d.id === id ? { ...d, ip: ip.trim() || undefined } : d,
              ),
            })
          }
          onRemove={(id) => removeSelected([id])}
          onRemoveLink={(linkId) =>
            onChange({ ...plan, links: plan.links.filter((l) => l.id !== linkId) })
          }
          onDhcp={() => {
            const { plan: next, assigned, prefix } = assignAddresses(plan)
            onChange(next)
            setNotice({
              text: `Der Router hat ${assigned} Adressen im Netz ${prefix}.x vergeben — so funktioniert DHCP.`,
              transient: true,
            })
          }}
        />
        )}
      </div>
    </div>
  )
}

export { areLinked }
