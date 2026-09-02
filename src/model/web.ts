/**
 * M6 — der Weg einer Internetseite.
 *
 * The Lehrplan's third competency asks the student to *describe* how a page
 * gets from a URL onto the screen. Describing is hard to practise from a
 * textbook picture, so here the seven steps are a walk the student steps
 * through one station at a time, on their own network: the machine, the
 * router and the addresses are the ones they drew in M2.
 *
 * The walk is derived, never stored. What is stored is the evidence — which
 * frames the student actually looked at and which questions they answered —
 * so a rule can tell "has seen the DNS answer" from "clicked to the end".
 */

import { INTERNET_HOSTS } from './console'
import type { Plan } from './plan'

export type Protocol = 'http' | 'https'

/** Sites the student can call up. Wikipedia takes one hop more than Google. */
export const HOSTS = ['google.com', 'wikipedia.org'] as const

/** The DNS server the provider runs — the "Telefonbuch". */
export const DNS_SERVER = { name: 'DNS-Server', ip: '217.237.148.22' }

export type Zone = 'lan' | 'wan' | 'dns'

export type Station = {
  id: string
  label: string
  /** Second line: the address, or where the station stands. */
  sub: string
  /** Third line: the role, where naming it is part of the lesson. */
  rolle?: string
  zone: Zone
}

/** Everything the walk needs to know about the student's own network. */
export type WalkContext = {
  deviceName: string
  deviceIp: string
  routerName: string
  routerIp: string
  hasModem: boolean
  host: string
  protocol: Protocol
}

const FALLBACK = {
  deviceName: 'PC',
  deviceIp: '192.168.178.20',
  routerName: 'Router',
  routerIp: '192.168.178.1',
  hasModem: true,
}

/**
 * Reads the walk's starting point out of the network the student drew. A page
 * that leaves from *their* PC with *their* address is the point of the module.
 */
export function contextFrom(
  plan: Plan | undefined,
  host: string,
  protocol: Protocol,
): WalkContext {
  const device = plan?.devices.find((d) => ['pc', 'laptop', 'tablet', 'smartphone'].includes(d.type))
  const router = plan?.devices.find((d) => d.type === 'router')
  return {
    deviceName: device?.name ?? FALLBACK.deviceName,
    deviceIp: device?.ip ?? FALLBACK.deviceIp,
    routerName: router?.name ?? FALLBACK.routerName,
    routerIp: router?.ip ?? FALLBACK.routerIp,
    hasModem: plan ? plan.devices.some((d) => d.type === 'modem') : FALLBACK.hasModem,
    host,
    protocol,
  }
}

/**
 * Splits a long hop name into a label and a second line, so it fits in a box
 * on the map: "Knoten Frankfurt (DE-CIX)" becomes "Knoten Frankfurt" over
 * "DE-CIX".
 */
function shorten(name: string): { label: string; sub: string } {
  const paren = name.match(/^(.*?)\s*\(([^)]+)\)$/)
  if (paren) return { label: paren[1]!, sub: paren[2]! }
  const cut = name.lastIndexOf(' ')
  if (name.length > 15 && cut > 0) {
    return { label: name.slice(0, cut), sub: name.slice(cut + 1) }
  }
  return { label: name, sub: 'Router im Internet' }
}

/** The stations the packet passes, from the student's desk to the web server. */
export function stationsFor(ctx: WalkContext): Station[] {
  const info = INTERNET_HOSTS[ctx.host] ?? INTERNET_HOSTS['google.com']!
  const stations: Station[] = [
    {
      id: 'browser',
      label: ctx.deviceName,
      sub: ctx.deviceIp,
      rolle: 'Browser (Client)',
      zone: 'lan',
    },
    { id: 'router', label: ctx.routerName, sub: ctx.routerIp, zone: 'lan' },
  ]
  if (ctx.hasModem) {
    stations.push({ id: 'modem', label: 'Modem', sub: 'zum Provider', zone: 'lan' })
  }
  const hops = info.hops.length ? info.hops : [ctx.host]
  hops.forEach((name, i) => {
    const last = i === hops.length - 1
    stations.push({
      id: last ? 'server' : `wan-${i}`,
      ...(last
        ? { label: ctx.host, sub: info.ip, rolle: 'Webserver' }
        : shorten(name)),
      zone: 'wan',
    })
  })
  return stations
}

/** The DNS server is a side trip, not a station on the way to the server. */
export const DNS_STATION: Station = {
  id: 'dns',
  label: DNS_SERVER.name,
  sub: DNS_SERVER.ip,
  zone: 'dns',
}

/** The seven steps, in the order the Quali expects them to be described. */
export const STEPS = [
  'URL im Browser eingeben',
  'Browser fragt den DNS-Server nach der IP-Adresse',
  'DNS-Server antwortet mit der IP-Adresse',
  'Browser schickt einen HTTP-Request an diese IP',
  'Der Request läuft über Router und Provider zum Server',
  'Der Server antwortet mit der HTML-Seite',
  'Der Browser stellt die Seite dar',
] as const

export type Packet = {
  titel: string
  zeilen: string[]
  /** The content is encrypted — the addresses on the outside never are. */
  verschluesselt: boolean
}

export type Frame = {
  /** Which of the seven steps this frame belongs to (1-based). */
  n: number
  /** Station the packet is at. */
  at: string
  /** What happens here, in a sentence or two. */
  what: string
  packet: Packet | null
  /** Outside the home network: someone on the way could read along. */
  offen: boolean
  /** Question asked at this station, if any. */
  frage?: string
}

/**
 * Deterministic gibberish, so an encrypted packet looks the same every time
 * and different for every line.
 */
function garble(text: string): string {
  let h = 2166136261
  const out: string[] = []
  for (const ch of text) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
    out.push((h >>> 24).toString(16).padStart(2, '0'))
  }
  return out.join('').slice(0, 46)
}

/** Encrypts the body but keeps the address line: a router must still route it. */
function seal(packet: Packet, ctx: WalkContext): Packet {
  if (ctx.protocol !== 'https' || packet.verschluesselt) return packet
  const [adresse, ...rest] = packet.zeilen
  return {
    titel: `${packet.titel} (verschlüsselt)`,
    zeilen: [adresse ?? '', ...rest.map((z) => garble(z))],
    verschluesselt: true,
  }
}

export function framesFor(ctx: WalkContext): Frame[] {
  const info = INTERNET_HOSTS[ctx.host] ?? INTERNET_HOSTS['google.com']!
  const stations = stationsFor(ctx)
  const url = `${ctx.protocol}://${ctx.host}`
  const wege = stations.filter((s) => s.zone === 'wan')

  const request: Packet = {
    titel: 'HTTP-Request',
    zeilen: [
      `Von ${ctx.deviceIp} an ${info.ip}`,
      'GET / HTTP/1.1',
      `Host: ${ctx.host}`,
    ],
    verschluesselt: false,
  }
  const response: Packet = {
    titel: 'HTTP-Response',
    zeilen: [
      `Von ${info.ip} an ${ctx.deviceIp}`,
      'HTTP/1.1 200 OK',
      'Content-Type: text/html',
      `<html><body><h1>${ctx.host}</h1>…</body></html>`,
    ],
    verschluesselt: false,
  }

  const frames: Frame[] = [
    {
      n: 1,
      at: 'browser',
      what:
        `Du tippst ${url} in die Adresszeile. Der Browser kennt jetzt den Namen der ` +
        'Seite — aber verschickt wird im Internet nur an Zahlen, an IP-Adressen.',
      packet: null,
      offen: false,
    },
    {
      n: 2,
      at: 'dns',
      what:
        `Der Browser fragt beim DNS-Server nach: "Welche IP-Adresse hat ${ctx.host}?" ` +
        'DNS ist das Telefonbuch des Internets.',
      packet: {
        titel: 'DNS-Anfrage',
        zeilen: [
          `Von ${ctx.deviceIp} an ${DNS_SERVER.ip}`,
          `Welche IP-Adresse hat ${ctx.host}?`,
        ],
        verschluesselt: false,
      },
      offen: false,
    },
    {
      n: 3,
      at: 'browser',
      what:
        `Der DNS-Server schlägt nach und antwortet. Jetzt weiß der Browser, wohin ` +
        'er sein Paket schicken muss.',
      packet: {
        titel: 'DNS-Antwort',
        zeilen: [
          `Von ${DNS_SERVER.ip} an ${ctx.deviceIp}`,
          `${ctx.host} = ${info.ip}`,
        ],
        verschluesselt: false,
      },
      offen: false,
      frage: 'dns',
    },
    {
      n: 4,
      at: 'browser',
      what:
        'Der Browser packt einen HTTP-Request: die Bitte um die Startseite, mit der ' +
        'IP-Adresse des Servers als Ziel und deiner eigenen als Absender.',
      packet: seal(request, ctx),
      offen: false,
    },
    {
      n: 5,
      at: 'router',
      what:
        `Dein ${ctx.routerName} nimmt das Paket an und schickt es nach draußen. Er merkt ` +
        `sich, dass die Antwort zu ${ctx.deviceName} gehört — deshalb reicht für die ganze ` +
        'Wohnung eine einzige Adresse nach außen.' +
        (ctx.hasModem ? '' : ' Hinter dem Router endet dein Heimnetz.'),
      packet: seal(request, ctx),
      offen: false,
      // Without a modem in the plan the router is the last station at home, so
      // the boundary question has to be asked here instead.
      frage: ctx.hasModem ? undefined : 'grenze',
    },
  ]

  if (ctx.hasModem) {
    frames.push({
      n: 5,
      at: 'modem',
      what:
        'Das Modem setzt die Daten auf die Leitung des Providers. Hier endet dein ' +
        'Heimnetz (LAN) und das Internet (WAN) beginnt.',
      packet: seal(request, ctx),
      offen: false,
      frage: 'grenze',
    })
  }

  wege.forEach((station, i) => {
    const last = station.id === 'server'
    frames.push({
      n: 5,
      at: station.id,
      what: last
        ? `Angekommen. Der Webserver von ${ctx.host} liest den Request und sucht die Seite heraus.`
        : `${station.label} schaut sich die Ziel-Adresse ${info.ip} an und reicht das Paket ` +
          'an die nächste Station weiter. Kein Router kennt den ganzen Weg — jeder kennt ' +
          'nur den nächsten Schritt.',
      packet: seal(request, ctx),
      offen: true,
      frage: i === 0 ? 'mitleser' : undefined,
    })
  })

  frames.push(
    {
      n: 6,
      at: 'browser',
      what:
        'Der Server schickt die HTML-Seite als HTTP-Response zurück — denselben Weg ' +
        'wieder retour, Station für Station.',
      packet: seal(response, ctx),
      offen: false,
    },
    {
      n: 7,
      at: 'browser',
      what:
        'Der Browser liest das HTML und stellt die Seite dar. Für jedes Bild und jede ' +
        'CSS-Datei wiederholt er die Schritte 4 bis 7 noch einmal.',
      packet: null,
      offen: false,
    },
  )
  return frames
}

// ---------------------------------------------------------------------------
// Questions asked along the way
// ---------------------------------------------------------------------------

export type Option = {
  text: string
  ok: (ctx: WalkContext) => boolean
  /** Shown after choosing — for a wrong answer it says what went wrong. */
  warum: string
}

export type Frage = {
  id: string
  text: string
  /** The right answer depends on the protocol, so it is asked once for each. */
  proProtokoll?: boolean
  optionen: Option[]
}

const ja = () => true
const nein = () => false

export const FRAGEN: Frage[] = [
  {
    id: 'dns',
    text: 'Was schickt der DNS-Server zurück?',
    optionen: [
      {
        text: `Die IP-Adresse der Seite`,
        ok: ja,
        warum: 'Genau. Name rein, Zahl raus — mehr macht der DNS-Server nicht.',
      },
      {
        text: 'Die fertige HTML-Seite',
        ok: nein,
        warum:
          'Die Seite kommt erst später, und sie kommt vom Webserver. Der DNS-Server ' +
          'kennt die Seite gar nicht, nur ihre Adresse.',
      },
      {
        text: 'Den Namen des Servers',
        ok: nein,
        warum: 'Den Namen kennst du schon, du hast ihn eingetippt. Gesucht ist die Zahl dahinter.',
      },
    ],
  },
  {
    id: 'grenze',
    text: 'Wo hört dein Heimnetz auf und wo fängt das Internet an?',
    optionen: [
      {
        text: 'Hinter Router und Modem',
        ok: ja,
        warum:
          'Richtig. Alles davor ist dein LAN mit privaten Adressen wie 192.168.…, ' +
          'alles danach das WAN — das Internet.',
      },
      {
        text: 'Direkt hinter deinem Gerät',
        ok: nein,
        warum:
          'Dein Gerät, der Router und alles andere in der Wohnung gehören zusammen ' +
          'zum LAN. Erst danach wird es fremd.',
      },
      {
        text: 'Erst beim Webserver',
        ok: nein,
        warum:
          'Der Webserver steht längst mitten im Internet. Die Grenze liegt viel früher ' +
          '— bei dir zu Hause.',
      },
    ],
  },
  {
    id: 'mitleser',
    text: 'Hier läuft dein Paket über fremde Geräte. Was kann jemand mitlesen, der es abfängt?',
    proProtokoll: true,
    optionen: [
      {
        text: 'Absender, Ziel und den ganzen Inhalt',
        ok: (ctx) => ctx.protocol === 'http',
        warum:
          'Das gilt bei http. Ohne Verschlüsselung steht alles im Klartext — auch das, ' +
          'was du in ein Formular eintippst.',
      },
      {
        text: 'Nur Absender und Ziel, der Inhalt ist verschlüsselt',
        ok: (ctx) => ctx.protocol === 'https',
        warum:
          'Das gilt bei https. Die Adressen müssen außen lesbar bleiben, sonst wüsste ' +
          'kein Router, wohin damit. Der Inhalt ist unlesbar.',
      },
      {
        text: 'Gar nichts',
        ok: nein,
        warum:
          'Ganz unsichtbar ist ein Paket nie. Absender und Ziel stehen immer außen ' +
          'drauf — sonst käme es nirgends an.',
      },
    ],
  },
]

export function frageById(id: string): Frage | undefined {
  return FRAGEN.find((f) => f.id === id)
}

/** Answers to the protocol-dependent question are kept apart. */
export function frageKey(frage: Frage, ctx: WalkContext): string {
  return frage.proProtokoll ? `${frage.id}:${ctx.protocol}` : frage.id
}

// ---------------------------------------------------------------------------
// The walk itself
// ---------------------------------------------------------------------------

export type Walk = {
  host: string
  protocol: Protocol
  /** Position in the frame list; -1 before the student has started. */
  frame: number
  /** What the student has actually seen and got right — the rules read this. */
  seen: string[]
  /**
   * The step-ordering exercise: one slot per step, 0 where the slot is still
   * empty. Slots rather than a growing list, so taking a misplaced card back
   * out does not shift all the cards behind it.
   */
  order: number[]
  /** Chosen option per question key, for redisplay. */
  answers: Record<string, string>
}

export const emptyWalk = (): Walk => ({
  host: HOSTS[0],
  protocol: 'http',
  frame: -1,
  seen: [],
  order: [],
  answers: {},
})

function remember(seen: string[], ...marks: string[]): string[] {
  const next = [...seen]
  for (const m of marks) if (!next.includes(m)) next.push(m)
  return next
}

/**
 * Moves to a frame and records what the student got to see there. Markers are
 * never removed, so stepping back and forth cannot un-learn anything.
 */
export function stepTo(walk: Walk, ctx: WalkContext, index: number): Walk {
  const frames = framesFor(ctx)
  const at = Math.max(0, Math.min(frames.length - 1, index))
  const frame = frames[at]!
  const marks = [`schritt:${frame.n}`, `station:${frame.at}`]
  if (frame.offen) marks.push(`offen:${ctx.protocol}`)
  if (frame.at === 'server') {
    marks.push(`ziel:${ctx.host}`)
    marks.push(`stationen:${stationsFor(ctx).filter((s) => s.zone === 'wan').length}`)
  }
  return { ...walk, frame: at, seen: remember(walk.seen, ...marks) }
}

export function answerFrage(
  walk: Walk,
  ctx: WalkContext,
  frage: Frage,
  option: Option,
): Walk {
  const key = frageKey(frage, ctx)
  return {
    ...walk,
    answers: { ...walk.answers, [key]: option.text },
    seen: option.ok(ctx) ? remember(walk.seen, `richtig:${key}`) : walk.seen,
  }
}

/** A new destination or protocol means a new walk — the route is a different one. */
export function restart(walk: Walk, patch: Partial<Pick<Walk, 'host' | 'protocol'>>): Walk {
  return { ...walk, ...patch, frame: -1 }
}

/** The empty board of the ordering exercise: seven slots, none filled. */
export const emptySlots = (): number[] => STEPS.map(() => 0)

/** Puts a card into the first free slot. */
export function placeStep(order: number[], step: number): number[] {
  const slots = order.length ? [...order] : emptySlots()
  const free = slots.indexOf(0)
  if (free === -1) return slots
  slots[free] = step
  return slots
}

/** Takes the card in this slot back out, leaving the others where they are. */
export function clearSlot(order: number[], slot: number): number[] {
  const slots = order.length ? [...order] : emptySlots()
  slots[slot] = 0
  return slots
}

/** Shuffles the seven step cards, so neighbours do not see the same order. */
export function shuffledSteps(seed: number): number[] {
  const cards = STEPS.map((_, i) => i + 1)
  let h = seed >>> 0 || 1
  for (let i = cards.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    const j = h % (i + 1)
    ;[cards[i], cards[j]] = [cards[j]!, cards[i]!]
  }
  // A shuffle that comes out already sorted would give the exercise away.
  return cards.every((c, i) => c === i + 1) ? cards.reverse() : cards
}
