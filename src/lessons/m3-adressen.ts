import type { QuizLesson, Task } from '../model/types'
import type { CheckResult } from '../model/types'
import { checkChoice, checkKeywords, normalize } from '../model/check'
import { intBetween, rng, rngFor, shuffle } from '../model/rng'

/**
 * M3 — Adressen: IP, DHCP, Gateway, MAC.
 *
 * The addressing *work* — giving every device in the plan an address — lives
 * in M2's fourth task and in M5's console, where it belongs. This module is
 * the knowledge around it, in the shape the Quali asks it: "Was ist eine
 * IP-Adresse?", "Wer vergibt sie?", and reading an `ipconfig` printout for
 * the own address and the router's (README §3). The printout is built from
 * the student's seed, so neighbours read different numbers.
 */

type ChoiceSpec = {
  id: string
  prompt: string
  correct: string
  wrong: string[]
  stups: string
  hinweis: string
  /** Why the right answer is right — shown with the solution. */
  answer: string
}

const CHOICES: ChoiceSpec[] = [
  {
    id: 'warum',
    prompt: 'Warum müssen in einem Netzwerk IP-Adressen vergeben werden?',
    correct: 'Damit jedes Gerät eindeutig erkannt und angesprochen werden kann',
    wrong: [
      'Damit das WLAN schneller wird',
      'Damit der Router weiß, wie viele Geräte es gibt',
      'Damit man im Internet anonym bleibt',
    ],
    stups: 'Stell dir Briefe vor: Was muss auf dem Umschlag stehen, damit der Brief ankommt?',
    hinweis: 'Ohne Adresse weiß niemand, welches Gerät gemeint ist — es geht ums Erkennen und Ansprechen.',
    answer:
      'Damit jedes Gerät eindeutig erkannt und angesprochen werden kann. Ohne Adresse ' +
      'könnte ein Paket gar nicht zugestellt werden.',
  },
  {
    id: 'was',
    prompt: 'Was ist eine IP-Adresse?',
    correct: 'Eine eindeutige Nummer, mit der ein Gerät im Netzwerk erkannt wird',
    wrong: [
      'Der Name eines Computers im Netzwerk',
      'Das Passwort für das WLAN',
      'Die Seriennummer des Routers',
    ],
    stups: 'Im Quali reicht ein Satz: eindeutig, Nummer, Gerät, Netzwerk.',
    hinweis: 'Sie besteht aus vier Zahlen mit Punkten, zum Beispiel 192.168.178.20 — eine Nummer, kein Name.',
    answer:
      'Eine eindeutige Nummer eines Geräts im Netzwerk, damit es erkannt werden kann — ' +
      'IP steht für Internet Protocol.',
  },
  {
    id: 'gueltig',
    prompt: 'Welche dieser Adressen ist eine gültige IPv4-Adresse?',
    correct: '192.168.178.20',
    wrong: ['192.168.178.300', '192.168.178', '192.168.178.20.1'],
    stups: 'Zähl die Blöcke — und schau, wie groß eine Zahl in einem Block höchstens sein darf.',
    hinweis: 'Vier Blöcke, durch Punkte getrennt, jeder von 0 bis 255.',
    answer:
      '192.168.178.20 — vier Blöcke, jeder zwischen 0 und 255. 300 ist zu groß, drei ' +
      'oder fünf Blöcke sind keine IPv4-Adresse.',
  },
  {
    id: 'wer',
    prompt: 'Wer vergibt die IP-Adressen im Heimnetz?',
    correct: 'Der Router, per DHCP',
    wrong: [
      'Der Internetanbieter, jedem Gerät einzeln',
      'Das Betriebssystem denkt sich selbst eine aus',
      'Der Switch',
    ],
    stups: 'Das Gerät, das zu Hause alles verwaltet — und einen Dienst mit vier Buchstaben dafür hat.',
    hinweis: 'DHCP: Dynamic Host Configuration Protocol. Es läuft auf dem Router.',
    answer:
      'Der Router — per DHCP (Dynamic Host Configuration Protocol). Jedes neue Gerät ' +
      'fragt beim Router nach und bekommt eine freie Adresse.',
  },
  {
    id: 'privat',
    prompt: 'Welche dieser Adressen ist eine private Adresse aus einem Heimnetz?',
    correct: '192.168.178.20',
    wrong: ['142.250.185.78', '8.8.8.8', '217.237.148.22'],
    stups: 'Eine Adresse fängt so an wie die, die du in M2 vergeben hast.',
    hinweis: 'Heimnetze nutzen fast immer 192.168.x.x — die anderen sind Adressen im Internet.',
    answer:
      '192.168.178.20. Adressen mit 192.168.… gibt es nur innerhalb eines Heimnetzes; ' +
      'im Internet kommen sie nicht vor.',
  },
  {
    id: 'extern',
    prompt:
      'Zu Hause surfen Laptop, Handy und Konsole gleichzeitig. Welche Adresse sieht eine Webseite?',
    correct: 'Von allen dreien dieselbe: die externe Adresse des Routers',
    wrong: [
      'Drei verschiedene private Adressen',
      'Die MAC-Adresse jedes Geräts',
      'Gar keine — Webseiten sehen keine Adressen',
    ],
    stups: 'Nach draußen geht alles über ein Gerät. Welches?',
    hinweis:
      'Die privaten 192.168.…-Adressen bleiben im Haus. Nach draußen tritt nur der Router ' +
      'auf — mit seiner einen externen Adresse.',
    answer:
      'Die externe Adresse des Routers — für alle drei dieselbe. Private Adressen verlassen ' +
      'das Heimnetz nie; der Router spricht für alle.',
  },
  {
    id: 'gateway',
    prompt: 'Dein PC schickt ein Paket an google.com. An welche Adresse geht es zuerst?',
    correct: 'An das Standardgateway — also den Router',
    wrong: ['Direkt an google.com', 'An den DNS-Server', 'An den Switch'],
    stups: 'Das Ziel liegt außerhalb deines Netzes. Wer ist die Tür nach draußen?',
    hinweis: 'In der ipconfig-Ausgabe heißt diese Adresse "Standardgateway".',
    answer:
      'An den Router, das Standardgateway. Alles, was nicht im eigenen Netz liegt, geht ' +
      'zuerst dorthin — der Router leitet es weiter.',
  },
  {
    id: 'mac',
    prompt: 'Was ist eine MAC-Adresse?',
    correct: 'Eine feste Hardware-Adresse der Netzwerkkarte, vom Hersteller vergeben',
    wrong: [
      'Eine IP-Adresse für Apple-Geräte',
      'Die Adresse des Routers im Internet',
      'Eine Adresse, die der Router per DHCP vergibt',
    ],
    stups: '"arp -a" zeigt sie neben jeder IP-Adresse. Sie sieht aus wie 3C-5A-B4-….',
    hinweis: 'Die IP-Adresse kann sich ändern, die MAC-Adresse nicht — sie steckt in der Hardware.',
    answer:
      'Die feste Adresse der Netzwerkkarte, vom Hersteller eingebrannt. Die IP-Adresse ' +
      'wird vergeben und kann wechseln; die MAC-Adresse bleibt.',
  },
]

function choiceTask(spec: ChoiceSpec, seed: number): Task {
  return {
    id: `m3-${spec.id}`,
    kind: 'choice',
    prompt: spec.prompt,
    // Shuffled per student so the position of the right answer is not a tell.
    options: shuffle(rngFor(seed, spec.id), [spec.correct, ...spec.wrong]),
    answer: spec.answer,
    hints: { stups: spec.stups, hinweis: spec.hinweis, loesung: spec.answer },
    check: (raw) => checkChoice(raw, spec.correct),
  }
}

/** The printout a student reads from, with their own numbers in it. */
export function ipconfigFor(seed: number): { ip: string; gateway: string; text: string } {
  const next = rng(seed ^ 0x3a3a)
  const third = [0, 1, 2, 178][intBetween(next, 0, 3)]!
  const host = intBetween(next, 20, 120)
  const ip = `192.168.${third}.${host}`
  const gateway = `192.168.${third}.1`
  const text = [
    'Windows-IP-Konfiguration',
    '',
    'Ethernet-Adapter Ethernet:',
    '',
    `   IPv4-Adresse  . . . . . . . . . . : ${ip}`,
    '   Subnetzmaske  . . . . . . . . . . : 255.255.255.0',
    `   Standardgateway . . . . . . . . . : ${gateway}`,
  ].join('\n')
  return { ip, gateway, text }
}

/** Exact address, read off the printout — with the one classic mix-up named. */
export function checkAddress(raw: string, wanted: string, other: string, otherIs: string): CheckResult {
  const given = normalize(raw).replace(/ /g, '.')
  if (given === wanted) return { ok: true }
  if (given === other) {
    return {
      ok: false,
      code: 'OTHER_LINE',
      message: `Das ist ${otherIs}.`,
      why: 'Schau noch einmal, in welcher Zeile die gesuchte Adresse steht.',
    }
  }
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(given)) {
    return {
      ok: false,
      code: 'FORMAT',
      message: 'Eine IPv4-Adresse hat vier Zahlen mit Punkten dazwischen.',
      why: 'Schreib sie genau so ab, wie sie in der Ausgabe steht.',
    }
  }
  return {
    ok: false,
    code: 'WRONG',
    message: 'Das steht so nicht in der Ausgabe.',
    why: 'Lies die Zeile noch einmal Zahl für Zahl ab.',
  }
}

function ipconfigTasks(seed: number): Task[] {
  const out = ipconfigFor(seed)
  const note = 'Lies die Antwort aus der Ausgabe unten ab.'
  return [
    {
      id: 'm3-ipconfig-befehl',
      kind: 'text',
      prompt: 'Mit welchem Befehl bekommst du diese Ausgabe auf einem Windows-Rechner?',
      pre: out.text,
      answer: 'ipconfig',
      hints: {
        stups: 'Der Befehl steht in M5 ganz oben auf der Liste.',
        hinweis: 'Du tippst ihn in die Eingabeaufforderung (cmd) und drückst Enter.',
        loesung: 'ipconfig — in der Eingabeaufforderung (cmd) eingeben.',
      },
      check: (raw) => checkKeywords(raw, [['ipconfig']]),
    },
    {
      id: 'm3-ipconfig-ip',
      kind: 'text',
      prompt: 'Wie lautet die IPv4-Adresse dieses Rechners?',
      note,
      pre: out.text,
      answer: out.ip,
      hints: {
        stups: 'Die Zeile heißt "IPv4-Adresse".',
        hinweis: 'Nicht das Standardgateway — das ist der Router, nicht dieser Rechner.',
        loesung: `${out.ip} — die Zeile "IPv4-Adresse" ist die Adresse des Rechners selbst.`,
      },
      check: (raw) => checkAddress(raw, out.ip, out.gateway, 'das Standardgateway, also der Router'),
    },
    {
      id: 'm3-ipconfig-gw',
      kind: 'text',
      prompt: 'Wie lautet die IP-Adresse des Routers?',
      note,
      pre: out.text,
      answer: out.gateway,
      hints: {
        stups: 'Der Router hat in dieser Ausgabe einen anderen Namen.',
        hinweis: 'Er heißt hier "Standardgateway" — die Tür nach draußen.',
        loesung: `${out.gateway} — das Standardgateway ist der Router.`,
      },
      check: (raw) =>
        checkAddress(raw, out.gateway, out.ip, 'die Adresse des Rechners selbst'),
    },
  ]
}

export const m3Adressen: QuizLesson = {
  kind: 'quiz',
  id: 'm3',
  module: 'M3',
  title: 'Adressen im Netzwerk',
  quali:
    '"Was ist eine IP-Adresse?" und "Wer vergibt sie?" sind jedes Jahr dabei, und eine ' +
    'ipconfig-Ausgabe zum Ablesen war 2022 und 2023 abgedruckt — eigene Adresse, ' +
    'Router-Adresse, welcher Befehl.',
  intro: {
    heading: 'Wer ist wer im Netzwerk?',
    body: [
      'Jedes Gerät im Netzwerk braucht eine eigene Adresse, sonst käme kein Paket an. ' +
        'Die IP-Adresse ist diese Nummer: vier Zahlen mit Punkten, zum Beispiel 192.168.178.20.',
      'Verteilt werden die Adressen vom Router — automatisch, per DHCP. Der Router hat dabei ' +
        'zwei Gesichter: nach innen seine private Adresse (meist …178.1, das Standardgateway), ' +
        'nach außen eine einzige externe Adresse, mit der das ganze Haus im Internet auftritt.',
      'Daneben gibt es die MAC-Adresse: die feste Nummer der Netzwerkkarte, die der Hersteller ' +
        'eingebrannt hat. Die IP-Adresse kann wechseln, die MAC-Adresse nicht.',
    ],
  },
  buildTasks: (seed) => [
    ...CHOICES.slice(0, 4).map((spec) => choiceTask(spec, seed)),
    ...ipconfigTasks(seed),
    ...CHOICES.slice(4).map((spec) => choiceTask(spec, seed)),
  ],
}
