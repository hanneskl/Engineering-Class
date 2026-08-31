import { DEVICES, type DeviceType } from '../model/plan'
import { DeviceIcon } from './icons'

const GROUPS: Array<{ key: 'aussen' | 'netz' | 'geraete'; title: string }> = [
  { key: 'aussen', title: 'Nach draußen' },
  { key: 'netz', title: 'Netzwerk' },
  { key: 'geraete', title: 'Geräte' },
]

const TYPES = Object.keys(DEVICES) as DeviceType[]

export function Palette({ onAdd }: { onAdd: (type: DeviceType) => void }) {
  return (
    <div className="palette">
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
