import { DEVICES, type Device, type Link, type Plan, linksOf, otherEnd, deviceById } from '../model/plan'
import { MEDIUM_LABEL } from './Canvas'
import { DeviceIcon } from './icons'

/**
 * Properties of the selected device. Doubles as the place where M1's
 * "was macht dieses Gerät" content is actually read, since that is where a
 * student looks when they are already thinking about the device.
 */
export function Inspector({
  plan,
  device,
  onRename,
  onIp,
  onRemove,
  onRemoveLink,
  onDhcp,
}: {
  plan: Plan
  device: Device | null
  onRename: (id: string, name: string) => void
  onIp: (id: string, ip: string) => void
  onRemove: (id: string) => void
  onRemoveLink: (linkId: string) => void
  /** Hands out addresses from the selected router. */
  onDhcp: () => void
}) {
  if (!device) {
    return (
      <aside className="inspector empty">
        <p>Klick ein Gerät an, um es zu benennen, ihm eine IP-Adresse zu geben oder es zu löschen.</p>
      </aside>
    )
  }

  const spec = DEVICES[device.type]
  const links: Link[] = linksOf(plan, device.id)

  return (
    <aside className="inspector">
      <div className="insp-head">
        <DeviceIcon type={device.type} size={20} />
        <strong>{spec.label}</strong>
      </div>
      <p className="insp-funktion">{spec.funktion}</p>

      <label htmlFor="insp-name">Name</label>
      <input
        id="insp-name"
        value={device.name}
        onChange={(e) => onRename(device.id, e.target.value)}
      />

      {spec.hasIp ? (
        <>
          <label htmlFor="insp-ip">IP-Adresse</label>
          <input
            id="insp-ip"
            value={device.ip ?? ''}
            placeholder="z. B. 192.168.178.20"
            inputMode="decimal"
            onChange={(e) => onIp(device.id, e.target.value)}
          />
        </>
      ) : (
        <p className="insp-noip">
          {device.type === 'internet'
            ? 'Das Internet ist kein einzelnes Gerät und hat deshalb hier keine Adresse.'
            : 'Ein Modem reicht die Daten nur durch und braucht im Heimnetz keine eigene Adresse.'}
        </p>
      )}

      {device.type === 'router' && (
        <div className="insp-dhcp">
          <button className="primary wide" onClick={onDhcp}>
            IP-Adressen automatisch vergeben
          </button>
          <p>
            Genau das macht ein echter Router per <strong>DHCP</strong>: Er gibt jedem Gerät
            im Netzwerk eine eigene Adresse.
          </p>
        </div>
      )}

      <div className="insp-links">
        <h4>
          Verbindungen ({links.length} von {spec.ports})
        </h4>
        {links.length === 0 ? (
          <p className="muted">Noch keine Verbindung.</p>
        ) : (
          <ul>
            {links.map((l) => {
              const other = deviceById(plan, otherEnd(l, device.id))
              return (
                <li key={l.id}>
                  <span className={`medium-dot ${l.medium}`} aria-hidden="true" />
                  <span className="grow">
                    {MEDIUM_LABEL[l.medium]} → {other?.name ?? '?'}
                  </span>
                  <button
                    className="link danger"
                    onClick={() => onRemoveLink(l.id)}
                    aria-label={`Verbindung zu ${other?.name} löschen`}
                  >
                    trennen
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <button className="ghost danger" onClick={() => onRemove(device.id)}>
        Gerät löschen
      </button>
    </aside>
  )
}
