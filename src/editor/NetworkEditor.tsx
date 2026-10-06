import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Canvas, MEDIUM_LABEL, type Tool } from './Canvas'
import { Palette } from './Palette'
import { Inspector } from './Inspector'

const ROW_BY_GROUP = { aussen: 0, netz: 1, geraete: 2 } as const

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
      let slot = 0
      let x = 0
      let y = 0
      do {
        x = 120 + (slot % 6) * 130
        y = 80 + row * 170 + Math.floor(slot / 6) * 70
        slot += 1
      } while (taken(x, y) && slot < 18)
      const device = makeDevice(plan, type, x, y)
      onChange({ ...plan, devices: [...plan.devices, device] })
      setSelectedId(device.id)
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

  const selected = selectedId ? (deviceById(plan, selectedId) ?? null) : null

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
            ? 'Geräte anklicken und verschieben. Zum Verbinden ein Kabel vom grünen Punkt zum nächsten Gerät ziehen.'
            : linkFromId
              ? `Klick jetzt das zweite Gerät an — ${deviceById(plan, linkFromId)?.name} ist ausgewählt.`
              : 'Klick zwei Geräte nacheinander an, um sie zu verbinden.'}
        </span>
      </div>

      {notice && (
        <div className={`notice${notice.transient ? ' notice-ok' : ''}`} role="status">
          {notice.text}
        </div>
      )}

      <div className="editor-body">
        <Palette onAdd={addDevice} />
        <Canvas
          plan={plan}
          tool={tool}
          selectedId={selectedId}
          linkFromId={linkFromId}
          faultyIds={faultyIds}
          onLink={tryLink}
          onSelect={setSelectedId}
          onMove={(id, x, y) =>
            onChange({
              ...plan,
              devices: plan.devices.map((d) => (d.id === id ? { ...d, x, y } : d)),
            })
          }
          onDeviceClick={handleDeviceClick}
          onBackgroundClick={() => setLinkFromId(null)}
        />
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
          onRemove={(id) => {
            onChange(removeDevice(plan, id))
            setSelectedId(null)
          }}
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
      </div>
    </div>
  )
}

export { areLinked }
