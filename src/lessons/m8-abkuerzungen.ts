import type { QuizLesson, Task } from '../model/types'
import { checkChoice, checkKeywords } from '../model/check'
import { rng, shuffle } from '../model/rng'
import type { Keywords } from '../model/check'

/**
 * M8 — Begriffe & Abkürzungen.
 *
 * The multiple-choice items are taken verbatim from the Quali papers
 * (2019, 2020, 2022, 2023, 2026), including the original distractors — those
 * distractors are the ones students actually fall for.
 */

type AbbrSpec = {
  id: string
  abbr: string
  answer: string
  keywords: Keywords
  stups: string
  hinweis: string
}

const ABBREVIATIONS: AbbrSpec[] = [
  {
    id: 'ip',
    abbr: 'IP',
    answer: 'Internet Protocol (Internetprotokoll)',
    keywords: [['internet'], ['protocol', 'protokoll']],
    stups: 'Der erste Teil ist das Netz, in dem wir alle unterwegs sind.',
    hinweis: 'Internet P… — es ist die Regel, nach der Geräte im Netz miteinander sprechen.',
  },
  {
    id: 'lan',
    abbr: 'LAN',
    answer: 'Local Area Network (lokales Netzwerk)',
    keywords: [['local', 'lokal'], ['area'], ['network', 'netzwerk']],
    stups: 'Es geht um ein Netzwerk an einem Ort — zum Beispiel in einer Wohnung.',
    hinweis: 'Local A… N… — das Gegenteil davon wäre ein WAN, ein Netz über weite Strecken.',
  },
  {
    id: 'wlan',
    abbr: 'WLAN',
    answer: 'Wireless Local Area Network (kabelloses lokales Netzwerk)',
    keywords: [['wireless', 'kabellos'], ['local', 'lokal'], ['network', 'netzwerk']],
    stups: 'Wie LAN — nur ohne Kabel.',
    hinweis: 'Das W steht für "wireless", also kabellos.',
  },
  {
    id: 'www',
    abbr: 'www',
    answer: 'World Wide Web',
    keywords: [['world', 'welt'], ['wide', 'weit'], ['web']],
    stups: 'Es steht am Anfang vieler Internetadressen.',
    hinweis: 'World W… W… — ein weltweites Netz aus Seiten.',
  },
  {
    id: 'dns',
    abbr: 'DNS',
    answer: 'Domain Name System — es übersetzt Namen wie google.com in IP-Adressen.',
    keywords: [['domain'], ['name'], ['system']],
    stups: 'Es sorgt dafür, dass du dir keine Zahlen merken musst.',
    hinweis: 'D… N… System — es macht aus einem Namen eine IP-Adresse.',
  },
  {
    id: 'dhcp',
    abbr: 'DHCP',
    answer: 'Dynamic Host Configuration Protocol — damit vergibt der Router die IP-Adressen.',
    keywords: [['dynamic', 'dynamisch'], ['host'], ['configuration', 'konfiguration']],
    stups: 'Das ist der Dienst, mit dem der Router IP-Adressen verteilt.',
    hinweis: 'Dynamic H… C… Protocol.',
  },
  {
    id: 'http',
    abbr: 'HTTP',
    answer: 'Hypertext Transfer Protocol — damit holt der Browser Webseiten.',
    keywords: [['hypertext', 'hyper text'], ['transfer'], ['protocol', 'protokoll']],
    stups: 'Es steht vorne in jeder Webadresse.',
    hinweis: 'Hypertext T… Protocol — das Protokoll für Webseiten.',
  },
  {
    id: 'nas',
    abbr: 'NAS',
    answer: 'Network Attached Storage — ein Speicher, der im Netzwerk hängt.',
    keywords: [['network', 'netzwerk'], ['attached', 'angeschlossen'], ['storage', 'speicher']],
    stups: 'Es ist eine Festplatte, auf die alle im Netzwerk zugreifen können.',
    hinweis: 'Network A… Storage.',
  },
  {
    id: 'url',
    abbr: 'URL',
    answer: 'Uniform Resource Locator — die Adresse einer Webseite.',
    keywords: [['uniform'], ['resource', 'ressource'], ['locator']],
    stups: 'Das ist das, was du oben in den Browser tippst.',
    hinweis: 'Uniform R… Locator.',
  },
]

function abbreviationTask(spec: AbbrSpec): Task {
  return {
    id: `m8-${spec.id}`,
    kind: 'text',
    prompt: `Wofür steht die Abkürzung ${spec.abbr}?`,
    answer: spec.answer,
    hints: { stups: spec.stups, hinweis: spec.hinweis, loesung: spec.answer },
    check: (raw) => checkKeywords(raw, spec.keywords),
  }
}

type ChoiceSpec = {
  id: string
  prompt: string
  options: string[]
  correct: string
  stups: string
  hinweis: string
  answer: string
}

/** Verbatim from the Quali papers, distractors included. */
const CHOICES: ChoiceSpec[] = [
  {
    id: 'lan-mc',
    prompt: 'Wofür steht die Abkürzung LAN?',
    options: [
      'Long Access Number',
      'Limitted Access Network',
      'Last Attempt News',
      'Local Area Network',
    ],
    correct: 'Local Area Network',
    stups: 'Nur eine der vier Möglichkeiten beschreibt wirklich ein Netzwerk an einem Ort.',
    hinweis: 'Das L steht für "local", also örtlich begrenzt.',
    answer: 'Local Area Network',
  },
  {
    id: 'dhcp-mc',
    prompt: 'Welches Gerät ist in einem Netzwerk für die Vergabe von IP-Adressen zuständig?',
    options: ['Switch', 'Access Point', 'Router', 'RJ-45'],
    correct: 'Router',
    stups: 'Es ist das Gerät, das auch die Verbindung ins Internet herstellt.',
    hinweis: 'Es macht das per DHCP — und es ist die zentrale Komponente im Heimnetz.',
    answer: 'Der Router — er vergibt die IP-Adressen per DHCP.',
  },
  {
    id: 'cookie-mc',
    prompt: 'Was ist ein Cookie, das von Internetseiten verwendet wird?',
    options: [
      'Ein Wert, der im Browser des Benutzers gespeichert wird',
      'Ein kleines Icon auf der Webseite',
      'Eine Bezahlart',
      'Eine Kryptowährung',
    ],
    correct: 'Ein Wert, der im Browser des Benutzers gespeichert wird',
    stups: 'Überleg, wo ein Cookie liegt — auf dem Server oder bei dir?',
    hinweis: 'Es wird bei dir gespeichert, nämlich im Browser.',
    answer: 'Ein Wert, der im Browser des Benutzers gespeichert wird.',
  },
  {
    id: 'browser-mc',
    prompt: 'Welcher der folgenden Begriffe ist kein Internetbrowser?',
    options: ['Chrome', 'Discord', 'Firefox', 'Safari'],
    correct: 'Discord',
    stups: 'Drei davon benutzt du, um Webseiten anzuschauen.',
    hinweis: 'Eines der vier Programme ist zum Chatten da, nicht zum Surfen.',
    answer: 'Discord ist kein Browser, sondern ein Chat-Programm.',
  },
  {
    id: 'voip-mc',
    prompt: 'Was ist VoIP?',
    options: [
      'Backup erstellen',
      'Audioclip downloaden',
      'Telefonieren übers Internet',
      'E-Mail versenden',
    ],
    correct: 'Telefonieren übers Internet',
    stups: 'Das "Vo" am Anfang steht für "Voice", also Stimme.',
    hinweis: 'Voice over IP — die Stimme wird über das Internetprotokoll übertragen.',
    answer: 'Telefonieren übers Internet (Voice over IP).',
  },
  {
    id: 'www-mc',
    prompt: 'Was bedeutet die Abkürzung www, die in Internetadressen vorkommt?',
    options: ['World Wide Web', 'Wer Wie Was', 'World Widget Wizzard', 'What‘s With Will'],
    correct: 'World Wide Web',
    stups: 'Drei der vier Möglichkeiten sind Quatsch.',
    hinweis: 'Ein weltweites ("world wide") Netz aus Seiten.',
    answer: 'World Wide Web',
  },
]

function choiceTask(spec: ChoiceSpec, seed: number): Task {
  return {
    id: `m8-${spec.id}`,
    kind: 'choice',
    prompt: spec.prompt,
    // Shuffled per student so the position of the right answer is not a tell.
    options: shuffle(seededFor(seed, spec.id), spec.options),
    answer: spec.answer,
    hints: { stups: spec.stups, hinweis: spec.hinweis, loesung: spec.answer },
    check: (raw) => checkChoice(raw, spec.correct),
  }
}

/** A per-task stream, so shuffling one question does not shift the others. */
function seededFor(seed: number, id: string): () => number {
  let h = seed >>> 0
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193)
  return rng(h >>> 0)
}

export const m8Abkuerzungen: QuizLesson = {
  kind: 'quiz',
  id: 'm8',
  module: 'M8',
  title: 'Begriffe & Abkürzungen',
  quali:
    'Diese Fragen kamen in fast jeder Quali dran — meist als Ankreuzfrage, manchmal ' +
    'zum Ausschreiben. Sie sind geschenkte Punkte, wenn du die Abkürzungen kannst.',
  intro: {
    heading: 'Die Abkürzungen, die immer drankommen',
    body: [
      'In der Quali werden Abkürzungen auf zwei Arten gefragt: entweder du sollst sie ' +
        'ausschreiben ("Wofür steht IP?"), oder du kreuzt die richtige von vier ' +
        'Möglichkeiten an.',
      'Die Ankreuzfragen hier stammen wörtlich aus alten Prüfungen — samt der falschen ' +
        'Antworten, die dort zur Auswahl standen.',
    ],
  },
  buildTasks: (seed) => [
    ...ABBREVIATIONS.map(abbreviationTask),
    ...CHOICES.map((spec) => choiceTask(spec, seed)),
  ],
}
