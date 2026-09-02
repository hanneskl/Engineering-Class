/**
 * The network plan: one graph that is both the drawing and (later) the thing
 * the simulation runs on. See ARCHITECTURE.md §2-3.
 */

export type DeviceType =
  | 'internet'
  | 'modem'
  | 'router'
  | 'switch'
  | 'accesspoint'
  | 'repeater'
  | 'pc'
  | 'laptop'
  | 'smartphone'
  | 'tablet'
  | 'console'
  | 'printer'
  | 'tv'
  | 'server'
  | 'nas'

export type Medium = 'cable' | 'wifi'

export type Device = {
  id: string
  type: DeviceType
  name: string
  x: number
  y: number
  ip?: string
}

export type Link = {
  id: string
  from: string
  to: string
  medium: Medium
}

export type Plan = {
  devices: Device[]
  links: Link[]
}

export type DeviceSpec = {
  label: string
  /** Grouping in the palette. */
  group: 'netz' | 'geraete' | 'aussen'
  /** How many links the device can carry. */
  ports: number
  /** Which media it can be connected with. */
  media: Medium[]
  /**
   * Whether the device carries an IP address of its own in this model.
   * The internet is not one machine, and a modem passes traffic through
   * without taking part in the home network — asking a student to invent
   * addresses for either would teach the wrong thing.
   */
  hasIp: boolean
  /** Short explanation, shown in the inspector — the M1 learning content. */
  funktion: string
}

/**
 * Port counts and media follow the class material. A router carries WLAN
 * because real home routers do ("In modernen Routern ist meist auch ein Modem
 * und ein W-LAN Access Point verbaut"), while a phone is wireless-only — that
 * asymmetry is a teaching point, not an oversight.
 */
export const DEVICES: Record<DeviceType, DeviceSpec> = {
  internet: {
    label: 'Internet',
    group: 'aussen',
    ports: 1,
    media: ['cable'],
    hasIp: false,
    funktion: 'Alles außerhalb deines Heimnetzes.',
  },
  modem: {
    label: 'Modem',
    group: 'aussen',
    ports: 2,
    media: ['cable'],
    hasIp: false,
    funktion:
      'Authentifiziert sich beim Provider und stellt die Internetverbindung her.',
  },
  router: {
    label: 'Router',
    group: 'netz',
    ports: 5,
    media: ['cable', 'wifi'],
    hasIp: true,
    funktion:
      'Leitet Daten zwischen verschiedenen Netzwerken weiter, meist zwischen Heimnetz und ' +
      'Internet. Er vergibt außerdem die IP-Adressen (DHCP).',
  },
  switch: {
    label: 'Switch',
    group: 'netz',
    ports: 5,
    media: ['cable'],
    hasIp: true,
    funktion: 'Verbindet mehrere Geräte in einem kabelgebundenen Netzwerk (LAN) miteinander.',
  },
  accesspoint: {
    label: 'Access Point',
    group: 'netz',
    ports: 6,
    media: ['cable', 'wifi'],
    hasIp: true,
    funktion:
      'Verbindet kabellose Geräte (WLAN) mit einem kabelgebundenen Netzwerk (LAN). ' +
      'Er selbst hängt per Kabel am Router.',
  },
  repeater: {
    label: 'WLAN-Repeater',
    group: 'netz',
    ports: 4,
    media: ['wifi'],
    hasIp: true,
    funktion:
      'Spezieller Access Point, der selbst per WLAN und nicht per Kabel mit dem Router ' +
      'verbunden ist — so verlängert er die Reichweite.',
  },
  pc: { label: 'PC', group: 'geraete', ports: 1, media: ['cable', 'wifi'], hasIp: true, funktion: 'Ein Computer im Netzwerk.' },
  laptop: { label: 'Laptop', group: 'geraete', ports: 1, media: ['cable', 'wifi'], hasIp: true, funktion: 'Ein tragbarer Computer.' },
  smartphone: {
    label: 'Smartphone',
    group: 'geraete',
    ports: 1,
    media: ['wifi'],
    hasIp: true,
    funktion: 'Geht nur über WLAN ins Netz — ein Netzwerkkabel passt nicht.',
  },
  tablet: {
    label: 'Tablet',
    group: 'geraete',
    ports: 1,
    media: ['wifi'],
    hasIp: true,
    funktion: 'Geht nur über WLAN ins Netz.',
  },
  console: { label: 'Konsole', group: 'geraete', ports: 1, media: ['cable', 'wifi'], hasIp: true, funktion: 'Spielkonsole.' },
  printer: { label: 'Drucker', group: 'geraete', ports: 1, media: ['cable', 'wifi'], hasIp: true, funktion: 'Drucker im Netzwerk.' },
  tv: { label: 'Smart-TV', group: 'geraete', ports: 1, media: ['cable', 'wifi'], hasIp: true, funktion: 'Fernseher mit Netzwerkanschluss.' },
  server: {
    label: 'Server',
    group: 'geraete',
    ports: 1,
    media: ['cable'],
    hasIp: true,
    funktion: 'Stellt Dienste im Netzwerk bereit, zum Beispiel Webseiten.',
  },
  nas: {
    label: 'NAS',
    group: 'geraete',
    ports: 1,
    media: ['cable'],
    hasIp: true,
    funktion: 'Stellt Speicherplatz im Netzwerk bereit, auf den alle zugreifen können.',
  },
}

export const emptyPlan = (): Plan => ({ devices: [], links: [] })

let counter = 0
export function newId(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

/** A fresh device, named "Laptop 2" if a "Laptop" already exists. */
export function makeDevice(plan: Plan, type: DeviceType, x: number, y: number): Device {
  const spec = DEVICES[type]
  const sameType = plan.devices.filter((d) => d.type === type).length
  return {
    id: newId(type),
    type,
    name: sameType === 0 ? spec.label : `${spec.label} ${sameType + 1}`,
    x,
    y,
  }
}

export function deviceById(plan: Plan, id: string): Device | undefined {
  return plan.devices.find((d) => d.id === id)
}

/** Links touching a device. */
export function linksOf(plan: Plan, id: string): Link[] {
  return plan.links.filter((l) => l.from === id || l.to === id)
}

export function otherEnd(link: Link, id: string): string {
  return link.from === id ? link.to : link.from
}

export function removeDevice(plan: Plan, id: string): Plan {
  return {
    devices: plan.devices.filter((d) => d.id !== id),
    links: plan.links.filter((l) => l.from !== id && l.to !== id),
  }
}

/** Media both endpoints support — empty when they cannot be connected at all. */
export function sharedMedia(a: Device, b: Device): Medium[] {
  const bm = DEVICES[b.type].media
  return DEVICES[a.type].media.filter((m) => bm.includes(m))
}

export function areLinked(plan: Plan, a: string, b: string): boolean {
  return plan.links.some(
    (l) => (l.from === a && l.to === b) || (l.from === b && l.to === a),
  )
}
