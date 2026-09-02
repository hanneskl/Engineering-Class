import {
  DEVICES,
  type Device,
  type Plan,
  deviceById,
  linksOf,
  otherEnd,
} from './plan'
import { pathBetween, reachableFrom } from './topology'

/**
 * A command line that runs against the network the student drew.
 *
 * Output copies the wording of the real Windows tools, because that is what
 * the Quali prints and what they see in class ("Antwort von … Zeit=2ms").
 * The point of the module is that the numbers are a *consequence of their own
 * diagram* (ARCHITECTURE.md §4.1) — a console hanging off a repeater really is
 * slower, and they can see why.
 */

/** Milliseconds a hop costs, by how it is connected. */
export const HOP_MS = {
  cable: 1,
  wifi: 5,
  /**
   * Charged once when a packet passes through a repeater, which has to receive
   * and re-send every frame. Charging it per link instead made a console
   * behind a repeater slower than a server in California — true to nobody's
   * intuition and the wrong lesson.
   */
  repeater: 10,
  /** Each router out in the internet. */
  isp: 8,
} as const

/** The prepared world beyond the router. Students explore it, never build it. */
export const INTERNET_HOSTS: Record<string, { ip: string; hops: string[] }> = {
  'google.com': {
    ip: '142.250.185.78',
    hops: ['Provider-Router München', 'Knoten Frankfurt (DE-CIX)', 'google.com'],
  },
  'wikipedia.org': {
    ip: '185.15.59.224',
    hops: ['Provider-Router München', 'Knoten Frankfurt (DE-CIX)', 'Amsterdam', 'wikipedia.org'],
  },
  'fritz.box': { ip: '192.168.178.1', hops: [] },
}

export type EntryKind = 'ipconfig' | 'ping' | 'arp' | 'tracert' | 'help' | 'error'

export type Entry = {
  input: string
  kind: EntryKind
  ok: boolean
  lines: string[]
  /** Device the command reached, when it reached one. */
  targetId?: string
  /** Round trip in ms, for ping. */
  ms?: number
  /** Number of hops, for tracert. */
  hops?: number
}

export type Session = {
  /** Which machine the student is sitting at. */
  atDeviceId: string | null
  entries: Entry[]
}

export const emptySession = (): Session => ({ atDeviceId: null, entries: [] })

/** Devices a student could plausibly be sitting at. */
export function terminals(plan: Plan): Device[] {
  return plan.devices.filter((d) => ['pc', 'laptop', 'tablet', 'smartphone'].includes(d.type))
}

/**
 * Cost of moving from one device to the next: the medium, plus the relay
 * penalty once, on arrival at a repeater.
 */
function costOfLink(plan: Plan, aId: string, bId: string): number {
  const link = linksOf(plan, aId).find((l) => otherEnd(l, aId) === bId)
  if (!link) return 0
  const medium = link.medium === 'wifi' ? HOP_MS.wifi : HOP_MS.cable
  const relay = deviceById(plan, bId)?.type === 'repeater' ? HOP_MS.repeater : 0
  return medium + relay
}

/** Total one-way cost along a path of device ids. */
export function pathCost(plan: Plan, path: string[]): number {
  let total = 0
  for (let i = 0; i < path.length - 1; i++) total += costOfLink(plan, path[i]!, path[i + 1]!)
  return total
}

/** The router acts as the default gateway. */
function gateway(plan: Plan): Device | undefined {
  return plan.devices.find((d) => d.type === 'router')
}

/** Resolve what the student typed: an IP, a device name, or a known host. */
function resolve(
  plan: Plan,
  raw: string,
): { device?: Device; host?: { name: string; ip: string; hops: string[] } } {
  const q = raw.trim().toLowerCase()
  const byIp = plan.devices.find((d) => d.ip?.toLowerCase() === q)
  if (byIp) return { device: byIp }
  const byName = plan.devices.find((d) => d.name.toLowerCase() === q)
  if (byName) return { device: byName }
  const host = INTERNET_HOSTS[q]
  if (host) return { host: { name: q, ...host } }
  return {}
}

/** Deterministic jitter, so the same command twice reads like a real ping. */
function jitter(seed: string, i: number): number {
  let h = 2166136261
  for (const ch of `${seed}#${i}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return ((h >>> 0) % 3) - 1
}

function fail(input: string, kind: EntryKind, ...lines: string[]): Entry {
  return { input, kind, ok: false, lines }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdIpconfig(plan: Plan, me: Device, input: string): Entry {
  const gw = gateway(plan)
  const lines = [
    'Windows-IP-Konfiguration',
    '',
    `Ethernet-Adapter (${me.name}):`,
    '',
    `   IPv4-Adresse  . . . . . . . . . . : ${me.ip ?? '(keine)'}`,
    `   Subnetzmaske  . . . . . . . . . . : 255.255.255.0`,
    `   Standardgateway . . . . . . . . . : ${gw?.ip ?? '(keins)'}`,
  ]
  if (!me.ip) {
    lines.push(
      '',
      'Dieses Gerät hat noch keine IP-Adresse. Vergib eine im Netzwerkplan —',
      'oder lass sie den Router per DHCP verteilen.',
    )
  }
  return { input, kind: 'ipconfig', ok: Boolean(me.ip), lines, targetId: me.id }
}

function cmdArp(plan: Plan, me: Device, input: string): Entry {
  const internet = plan.devices.find((d) => d.type === 'internet')
  const reachable = [...reachableFrom(plan, me.id)].filter((id) => id !== me.id && id !== internet?.id)
  const neighbours = reachable
    .map((id) => deviceById(plan, id)!)
    .filter((d) => d.ip && DEVICES[d.type].hasIp)

  if (!neighbours.length) {
    return fail(input, 'arp', 'Keine Einträge gefunden.', '', 'Hängt dieses Gerät überhaupt am Netzwerk?')
  }
  return {
    input,
    kind: 'arp',
    ok: true,
    lines: [
      `Schnittstelle: ${me.ip ?? '?'}`,
      '  Internetadresse       Physische Adresse      Typ',
      ...neighbours.map(
        (d) => `  ${(d.ip ?? '').padEnd(21)} ${macFor(d.id)}      dynamisch   (${d.name})`,
      ),
    ],
  }
}

/** Stable pretend MAC, derived from the device id. */
function macFor(id: string): string {
  let h = 2166136261
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const b = (n: number) => (((h >>> (n * 5)) & 0xff) | 0x02).toString(16).padStart(2, '0')
  return `${b(0)}-${b(1)}-${b(2)}-${b(3)}-${b(4)}-${b(5)}`
}

function cmdPing(plan: Plan, me: Device, arg: string, input: string): Entry {
  if (!arg) return fail(input, 'error', 'Bitte gib ein Ziel an, zum Beispiel: ping 192.168.178.1')
  const { device, host } = resolve(plan, arg)

  if (host) {
    const gw = gateway(plan)
    const internet = plan.devices.find((d) => d.type === 'internet')
    if (!gw || !internet || !pathBetween(plan, me.id, internet.id)) {
      return fail(
        input,
        'ping',
        `Ping-Anforderung konnte Host "${arg}" nicht finden.`,
        '',
        'Dein Netz hat keine Verbindung ins Internet. Zeichne Router, Modem und Internet ein.',
      )
    }
    const local = pathCost(plan, pathBetween(plan, me.id, gw.id) ?? [])
    const base = local + host.hops.length * HOP_MS.isp
    return pingReply(input, `${arg} [${host.ip}]`, base, arg)
  }

  if (!device) {
    return fail(input, 'ping', `Ping-Anforderung konnte Host "${arg}" nicht finden.`, '',
      'Tipp: Du kannst eine IP-Adresse oder den Namen eines Geräts aus deinem Plan angeben.')
  }
  const path = pathBetween(plan, me.id, device.id)
  if (!path) {
    return {
      input,
      kind: 'ping',
      ok: false,
      targetId: device.id,
      lines: [
        `Ping wird ausgeführt für ${device.ip ?? device.name}:`,
        'Zielhost nicht erreichbar.',
        '',
        `${device.name} hängt nicht am selben Netzwerk wie ${me.name}.`,
      ],
    }
  }
  const entry = pingReply(input, device.ip ?? device.name, pathCost(plan, path), device.name)
  return { ...entry, targetId: device.id }
}

function pingReply(input: string, label: string, base: number, seed: string): Entry {
  const times = [0, 1, 2, 3].map((i) => Math.max(1, base + jitter(seed, i)))
  const min = Math.min(...times)
  const max = Math.max(...times)
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  return {
    input,
    kind: 'ping',
    ok: true,
    ms: avg,
    lines: [
      `Ping wird ausgeführt für ${label} mit 32 Bytes Daten:`,
      ...times.map((t) => `Antwort von ${label.split(' ')[0]}: Bytes=32 Zeit=${t}ms TTL=64`),
      '',
      `Ping-Statistik für ${label.split(' ')[0]}:`,
      '    Pakete: Gesendet = 4, Empfangen = 4, Verloren = 0 (0% Verlust),',
      'Ca. Zeitangaben in Millisek.:',
      `    Minimum = ${min}ms, Maximum = ${max}ms, Mittelwert = ${avg}ms`,
    ],
  }
}

function cmdTracert(plan: Plan, me: Device, arg: string, input: string): Entry {
  if (!arg) return fail(input, 'error', 'Bitte gib ein Ziel an, zum Beispiel: tracert google.com')
  const { device, host } = resolve(plan, arg)
  const gw = gateway(plan)

  if (host) {
    const internet = plan.devices.find((d) => d.type === 'internet')
    if (!gw || !internet || !pathBetween(plan, me.id, internet.id)) {
      return fail(input, 'tracert', `Routenverfolgung zu ${arg} nicht möglich.`, '',
        'Dein Netz hat keine Verbindung ins Internet.')
    }
    const localPath = (pathBetween(plan, me.id, gw.id) ?? []).slice(1)
    let running = 0
    const rows: string[] = []
    localPath.forEach((id, i) => {
      running += costOfLink(plan, i === 0 ? me.id : localPath[i - 1]!, id)
      const d = deviceById(plan, id)!
      rows.push(`  ${String(rows.length + 1).padStart(2)}    ${String(running).padStart(3)} ms  ${d.name} (${d.ip ?? '—'})`)
    })
    host.hops.forEach((name) => {
      running += HOP_MS.isp
      rows.push(`  ${String(rows.length + 1).padStart(2)}    ${String(running).padStart(3)} ms  ${name}`)
    })
    return {
      input,
      kind: 'tracert',
      ok: true,
      hops: rows.length,
      ms: running,
      lines: [
        `Routenverfolgung zu ${arg} [${host.ip}] über maximal 30 Abschnitte:`,
        '',
        ...rows,
        '',
        'Ablaufverfolgung beendet.',
      ],
    }
  }

  if (!device) return fail(input, 'tracert', `Routenverfolgung zu "${arg}" nicht möglich: Host unbekannt.`)
  const path = pathBetween(plan, me.id, device.id)
  if (!path) {
    return fail(input, 'tracert', `Routenverfolgung zu ${device.name}:`, 'Zielhost nicht erreichbar.')
  }
  let running = 0
  const rows = path.slice(1).map((id, i) => {
    running += costOfLink(plan, i === 0 ? me.id : path[i]!, id)
    const d = deviceById(plan, id)!
    return `  ${String(i + 1).padStart(2)}    ${String(running).padStart(3)} ms  ${d.name} (${d.ip ?? '—'})`
  })
  return {
    input,
    kind: 'tracert',
    ok: true,
    hops: rows.length,
    ms: running,
    targetId: device.id,
    lines: [
      `Routenverfolgung zu ${device.name} über maximal 30 Abschnitte:`,
      '',
      ...rows,
      '',
      'Ablaufverfolgung beendet.',
    ],
  }
}

const HELP = [
  'Verfügbare Befehle:',
  '',
  '  ipconfig            Zeigt die eigene IP-Adresse und das Standardgateway.',
  '  arp -a              Listet die Geräte auf, die im selben Netz erreichbar sind.',
  '  ping <ziel>         Misst, wie lange ein Paket zu einem Ziel und zurück braucht.',
  '  tracert <ziel>      Zeigt jede Station auf dem Weg zum Ziel.',
  '  hilfe               Diese Übersicht.',
  '',
  'Als <ziel> kannst du eine IP-Adresse, einen Gerätenamen aus deinem Plan',
  'oder google.com angeben.',
]

/** Runs one line and returns what the terminal should print. */
export function run(plan: Plan, session: Session, input: string): Entry {
  const text = input.trim()
  if (!text) return { input, kind: 'help', ok: true, lines: [] }

  const me = session.atDeviceId ? deviceById(plan, session.atDeviceId) : undefined
  const [head, ...rest] = text.split(/\s+/)
  const cmd = (head ?? '').toLowerCase()
  const arg = rest.filter((r) => !r.startsWith('-')).join(' ')

  if (cmd === 'hilfe' || cmd === 'help' || cmd === '?') {
    return { input, kind: 'help', ok: true, lines: HELP }
  }
  if (!me) {
    return fail(input, 'error', 'Du sitzt an keinem Gerät.', '',
      'Wähl oben aus, an welchem Computer du sitzt.')
  }
  switch (cmd) {
    case 'ipconfig':
      return cmdIpconfig(plan, me, input)
    case 'arp':
      return cmdArp(plan, me, input)
    case 'ping':
      return cmdPing(plan, me, arg, input)
    case 'tracert':
    case 'traceroute':
      return cmdTracert(plan, me, arg, input)
    default:
      return fail(input, 'error',
        `"${head}" ist kein bekannter Befehl.`, '', 'Tipp: Schreib "hilfe" für eine Übersicht.')
  }
}
