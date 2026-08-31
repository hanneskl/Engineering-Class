import {
  DEVICES,
  type Device,
  type DeviceType,
  type Medium,
  type Plan,
  areLinked,
  deviceById,
  linksOf,
  sharedMedia,
} from './plan'
import { reachableFrom } from './topology'

/**
 * The rules that judge a plan.
 *
 * Each returns a German diagnosis naming the devices at fault, so the canvas
 * can highlight them. With no teacher in the room this text *is* the teaching
 * (ARCHITECTURE.md §5.1) — "ungültig" would be useless.
 */

export type Finding = {
  code: string
  message: string
  why: string
  /** Highlighted on the canvas. */
  deviceIds: string[]
}

export type Rule = (plan: Plan) => Finding[]

const label = (d: Device) => d.name

// ---------------------------------------------------------------------------
// Rules that always apply while drawing
// ---------------------------------------------------------------------------

/** A phone has no socket. Cabling one is the classic beginner mistake. */
export const wirelessOnlyMustUseWifi: Rule = (plan) =>
  plan.links
    .filter((l) => l.medium === 'cable')
    .flatMap((l) => {
      const ends = [deviceById(plan, l.from), deviceById(plan, l.to)]
      const offender = ends.find((d) => d && !DEVICES[d.type].media.includes('cable'))
      if (!offender) return []
      return [
        {
          code: 'WIFI_ONLY_DEVICE_CABLED',
          message: `${label(offender)} kann nicht per Kabel angeschlossen werden.`,
          why: `${DEVICES[offender.type].label} hat keine Netzwerkbuchse. Verbinde das Gerät über WLAN, zum Beispiel mit einem Access Point oder dem Router.`,
          deviceIds: [offender.id],
        },
      ]
    })

/** An access point's uplink is a cable — that is what separates it from a repeater. */
export const accessPointNeedsCableUplink: Rule = (plan) =>
  plan.devices
    .filter((d) => d.type === 'accesspoint')
    .filter((ap) => linksOf(plan, ap.id).length > 0)
    .filter((ap) => !linksOf(plan, ap.id).some((l) => l.medium === 'cable'))
    .map((ap) => ({
      code: 'AP_WITHOUT_CABLE',
      message: `${label(ap)} hängt nur im WLAN.`,
      why: 'Ein Access Point ist per Kabel mit dem Router oder Switch verbunden. Ein Gerät, das selbst nur über WLAN hängt, ist ein Repeater.',
      deviceIds: [ap.id],
    }))

/** …and a repeater's uplink is emphatically not. */
export const repeaterMustBeWireless: Rule = (plan) =>
  plan.links
    .filter((l) => l.medium === 'cable')
    .flatMap((l) => {
      const ends = [deviceById(plan, l.from), deviceById(plan, l.to)]
      const rep = ends.find((d) => d?.type === 'repeater')
      if (!rep) return []
      return [
        {
          code: 'REPEATER_CABLED',
          message: `${label(rep)} ist per Kabel verbunden.`,
          why: 'Ein Repeater verlängert das WLAN und hängt selbst per WLAN am Router. Wenn du ein Kabel legen kannst, nimm einen Access Point.',
          deviceIds: [rep.id],
        },
      ]
    })

export const portsNotExceeded: Rule = (plan) =>
  plan.devices
    .filter((d) => linksOf(plan, d.id).length > DEVICES[d.type].ports)
    .map((d) => ({
      code: 'TOO_MANY_LINKS',
      message: `${label(d)} hat zu viele Verbindungen.`,
      why: `Ein ${DEVICES[d.type].label} hat ${DEVICES[d.type].ports} Anschlüsse, du hast aber ${linksOf(plan, d.id).length} Verbindungen gezogen. Ein Switch schafft Platz für mehr Kabel.`,
      deviceIds: [d.id],
    }))

export const noDuplicateIps: Rule = (plan) => {
  const byIp = new Map<string, Device[]>()
  for (const d of plan.devices) {
    if (!d.ip) continue
    byIp.set(d.ip, [...(byIp.get(d.ip) ?? []), d])
  }
  return [...byIp.entries()]
    .filter(([, ds]) => ds.length > 1)
    .map(([ip, ds]) => ({
      code: 'DUPLICATE_IP',
      message: `Die IP-Adresse ${ip} ist doppelt vergeben.`,
      why: `${ds.map(label).join(' und ')} haben dieselbe Adresse. Jedes Gerät im Netzwerk braucht eine eigene — sonst weiß der Router nicht, wer gemeint ist.`,
      deviceIds: ds.map((d) => d.id),
    }))
}

export const validIpFormat: Rule = (plan) =>
  plan.devices
    .filter((d) => d.ip && !isValidIpv4(d.ip))
    .map((d) => ({
      code: 'BAD_IP',
      message: `${label(d)} hat keine gültige IP-Adresse.`,
      why: 'Eine IPv4-Adresse besteht aus vier Zahlen von 0 bis 255, getrennt durch Punkte — zum Beispiel 192.168.178.20.',
      deviceIds: [d.id],
    }))

export function isValidIpv4(value: string): boolean {
  const parts = value.trim().split('.')
  if (parts.length !== 4) return false
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
}

/** Rules that hold for any plan, checked live while the student draws. */
export const ALWAYS: Rule[] = [
  wirelessOnlyMustUseWifi,
  accessPointNeedsCableUplink,
  repeaterMustBeWireless,
  portsNotExceeded,
  validIpFormat,
  noDuplicateIps,
]

export function checkAlways(plan: Plan): Finding[] {
  return ALWAYS.flatMap((rule) => rule(plan))
}

/**
 * Everything wrong with a plan for a given task: the task's own rules *and*
 * the rules that hold for any network. Both must come back clean — a plan with
 * a duplicate address is not finished just because the task only asked for a
 * router and three PCs. One function so the view and the tests cannot drift.
 */
export function evaluateTask(plan: Plan, rules: Rule[]): Finding[] {
  return [...checkAlways(plan), ...rules.flatMap((rule) => rule(plan))]
}

/** A task is done when nothing is wrong and the student actually drew something. */
export function isTaskSolved(plan: Plan, rules: Rule[]): boolean {
  return plan.devices.length > 0 && evaluateTask(plan, rules).length === 0
}

// ---------------------------------------------------------------------------
// Rule builders used by individual tasks
// ---------------------------------------------------------------------------

export function requireCount(type: DeviceType, min: number): Rule {
  return (plan) => {
    const have = plan.devices.filter((d) => d.type === type).length
    if (have >= min) return []
    const spec = DEVICES[type]
    return [
      {
        code: 'MISSING_DEVICE',
        message:
          min === 1
            ? `Es fehlt noch ein ${spec.label}.`
            : `Du brauchst ${min} × ${spec.label}, hast aber ${have}.`,
        why: spec.funktion,
        deviceIds: [],
      },
    ]
  }
}

/** Nothing may be left floating: every device hangs off the same network. */
export function allConnectedTo(type: DeviceType): Rule {
  return (plan) => {
    const anchor = plan.devices.find((d) => d.type === type)
    if (!anchor) return []
    const reachable = reachableFrom(plan, anchor.id)
    const orphans = plan.devices.filter((d) => !reachable.has(d.id))
    if (!orphans.length) return []
    return [
      {
        code: 'NOT_CONNECTED',
        message:
          orphans.length === 1
            ? `${label(orphans[0]!)} hängt noch nicht am Netzwerk.`
            : `${orphans.length} Geräte hängen noch nicht am Netzwerk.`,
        why: `Zieh eine Verbindung von ${orphans.map(label).join(', ')} zum ${DEVICES[type].label} — direkt oder über einen Switch, Access Point oder Repeater.`,
        deviceIds: orphans.map((d) => d.id),
      },
    ]
  }
}

/** The one door to the outside. */
export function routerConnectsToInternet(): Rule {
  return (plan) => {
    const router = plan.devices.find((d) => d.type === 'router')
    const internet = plan.devices.find((d) => d.type === 'internet')
    if (!router || !internet) return []
    const modem = plan.devices.find((d) => d.type === 'modem')
    const ok = modem
      ? areLinked(plan, router.id, modem.id) && areLinked(plan, modem.id, internet.id)
      : areLinked(plan, router.id, internet.id)
    if (ok) return []
    return [
      {
        code: 'NO_UPLINK',
        message: 'Dein Netzwerk hat noch keine Verbindung ins Internet.',
        why: modem
          ? 'Verbinde den Router mit dem Modem und das Modem mit dem Internet.'
          : 'Verbinde den Router mit dem Internet.',
        deviceIds: [router.id, internet.id],
      },
    ]
  }
}

/** End devices reach the internet only through the router, never around it. */
export function noDeviceBypassesRouter(): Rule {
  return (plan) => {
    const router = plan.devices.find((d) => d.type === 'router')
    const internet = plan.devices.find((d) => d.type === 'internet')
    if (!router || !internet) return []
    const withoutRouter: Plan = {
      devices: plan.devices.filter((d) => d.id !== router.id),
      links: plan.links.filter((l) => l.from !== router.id && l.to !== router.id),
    }
    const stillReaching = [...reachableFrom(withoutRouter, internet.id)].filter(
      (id) => id !== internet.id && deviceById(plan, id)?.type !== 'modem',
    )
    if (!stillReaching.length) return []
    const names = stillReaching.map((id) => deviceById(plan, id)!).map(label)
    return [
      {
        code: 'BYPASSES_ROUTER',
        message: `${names.join(', ')} ${names.length === 1 ? 'geht' : 'gehen'} am Router vorbei ins Internet.`,
        why: 'Aller Verkehr aus deinem Heimnetz läuft über den Router — er ist das Tor nach draußen. Führe die Verbindung über den Router.',
        deviceIds: stillReaching,
      },
    ]
  }
}

export function everyDeviceHasIp(exclude: DeviceType[] = ['internet']): Rule {
  return (plan) => {
    const missing = plan.devices.filter((d) => !exclude.includes(d.type) && !d.ip)
    if (!missing.length) return []
    return [
      {
        code: 'IP_MISSING',
        message:
          missing.length === 1
            ? `${label(missing[0]!)} hat noch keine IP-Adresse.`
            : `${missing.length} Geräten fehlt noch die IP-Adresse.`,
        why: 'Klick ein Gerät an und trag rechts seine Adresse ein. Ohne Adresse kann es im Netzwerk nicht angesprochen werden.',
        deviceIds: missing.map((d) => d.id),
      },
    ]
  }
}

/** Private home networks share one prefix; mixing them is a real-world bug. */
export function ipsInSameNetwork(): Rule {
  return (plan) => {
    const withIp = plan.devices.filter((d) => d.ip && isValidIpv4(d.ip) && d.type !== 'internet')
    if (withIp.length < 2) return []
    const prefixOf = (ip: string) => ip.split('.').slice(0, 3).join('.')
    const counts = new Map<string, Device[]>()
    for (const d of withIp) {
      const p = prefixOf(d.ip!)
      counts.set(p, [...(counts.get(p) ?? []), d])
    }
    if (counts.size < 2) return []
    const sorted = [...counts.entries()].sort((a, b) => b[1].length - a[1].length)
    const [mainPrefix] = sorted[0]!
    const strays = sorted.slice(1).flatMap(([, ds]) => ds)
    return [
      {
        code: 'DIFFERENT_NETWORK',
        message: `${strays.map(label).join(', ')} ${strays.length === 1 ? 'liegt' : 'liegen'} in einem anderen Netz.`,
        why: `Die anderen Geräte fangen mit ${mainPrefix}. an. Geräte im selben Heimnetz teilen sich diesen Anfang und unterscheiden sich nur in der letzten Zahl.`,
        deviceIds: strays.map((d) => d.id),
      },
    ]
  }
}

/** Used by the editor to explain why a link was refused. */
export function whyCannotLink(
  plan: Plan,
  a: Device,
  b: Device,
  medium: Medium,
): string | null {
  if (a.id === b.id) return 'Ein Gerät kann nicht mit sich selbst verbunden werden.'
  if (areLinked(plan, a.id, b.id)) return `${label(a)} und ${label(b)} sind schon verbunden.`

  const shared = sharedMedia(a, b)
  if (!shared.length) {
    return `${label(a)} und ${label(b)} lassen sich nicht direkt verbinden — sie haben keine gemeinsame Anschlussart.`
  }
  if (!shared.includes(medium)) {
    const other = medium === 'cable' ? 'WLAN' : 'Kabel'
    return `Das geht hier nicht per ${medium === 'cable' ? 'Kabel' : 'WLAN'}. Probier es mit ${other}.`
  }
  for (const d of [a, b]) {
    if (linksOf(plan, d.id).length >= DEVICES[d.type].ports) {
      return `${label(d)} hat keinen freien Anschluss mehr (${DEVICES[d.type].ports} Stück).`
    }
  }
  return null
}
