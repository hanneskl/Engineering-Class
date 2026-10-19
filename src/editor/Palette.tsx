import { DEVICES, type DeviceType } from '../model/plan'
import { DeviceIcon } from './icons'

const GROUPS: Array<{ key: 'aussen' | 'netz' | 'geraete'; title: string }> = [
  { key: 'aussen', title: 'Nach draußen' },
  { key: 'netz', title: 'Netzwerk' },
  { key: 'geraete', title: 'Geräte' },
]

const TYPES = Object.keys(DEVICES) as DeviceType[]

/**
 * Where devices come from — and where they go back to: a device dragged off
 * the canvas and dropped here is deleted (#3). `trash` is set while one hovers.
 */
export function Palette({
  onAdd,
  boxRef,
  trash,
}: {
  onAdd: (type: DeviceType) => void
  boxRef?: React.Ref<HTMLDivElement>
  trash?: boolean
}) {
  return (
    <div ref={boxRef} className={`palette${trash ? ' trash' : ''}`}>
      {trash && (
        <div className="palette-trash" aria-live="polite">
          Loslassen zum Löschen
        </div>
      )}
      {GROUPS.map((g) => (
        <section key={g.key}>
          <h3>{g.title}</h3>
          <div className="palette-items">
            {TYPES.filter((t) => DEVICES[t].group === g.key).map((t) => (
              <button
                key={t}
                className="pal-item"
                title={DEVICES[t].funktion}
                onClick={() => onAdd(t)}
              >
                <DeviceIcon type={t} size={22} />
                <span>{DEVICES[t].label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
