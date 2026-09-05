import type { BuildLesson } from '../model/types'
import {
  allConnectedTo,
  everyDeviceHasIp,
  ipsInSameNetwork,
  noDeviceBypassesRouter,
  noDuplicateIps,
  requireCount,
  routerConnectsToInternet,
} from '../model/rules'

/**
 * M2 — Netzwerk zeichnen.
 *
 * Follows the class sequence: first the classroom LAN, then the link to the
 * internet, then wireless devices, then addresses, then their own home network.
 * Checks are structural rules, never a stored solution — the home network
 * especially is different for every student, so only plausibility can be
 * judged (README §4, T2.4).
 *
 * Each goal carries the rules that tick it, so the checklist the student reads
 * and the checks the tool runs are the same thing.
 */
export const m2Netzwerk: BuildLesson = {
  kind: 'build',
  id: 'm2',
  module: 'M2',
  title: 'Netzwerk zeichnen',
  quali:
    'In der Quali sollst du Netzwerkschemata beschriften und Komponenten ihrer ' +
    'Beschreibung zuordnen. Wer ein Netz selbst gebaut hat, kann beides.',
  intro: {
    heading: 'Wie hängt ein Netzwerk zusammen?',
    body: [
      'Ein Heimnetz hat immer dieselbe Grundform: Ganz außen das Internet, dann ein ' +
        'Router als Tor nach draußen, und dahinter deine Geräte.',
      'Der Router verbindet zwei Welten — dein Netz zu Hause und das Internet. Reichen ' +
        'seine Anschlüsse nicht, steckst du einen Switch dazu. Für Geräte ohne Kabel ' +
        'sorgt ein Access Point (der selbst per Kabel hängt) oder ein Repeater (der ' +
        'selbst per WLAN hängt).',
      'Zeichne unten: links wählst du ein Gerät aus, dann verbindest du zwei Geräte, ' +
        'indem du oben "Mit Kabel verbinden" oder "Mit WLAN verbinden" anklickst und danach die beiden ' +
        'Geräte. Oben in der Aufgabe siehst du, was schon stimmt.',
    ],
  },
  tasks: [
    {
      id: 'm2-lan',
      title: 'Das Netzwerk im Computerraum',
      brief:
        'Baue ein kabelgebundenes Netzwerk mit einem Router, einem Switch und drei Computern.',
      ziele: [
        { text: 'Ein Router', rules: [requireCount('router', 1)] },
        { text: 'Ein Switch', rules: [requireCount('switch', 1)] },
        { text: 'Drei PCs', rules: [requireCount('pc', 3)] },
        {
          text: 'Alles hängt zusammen — kein Gerät steht allein',
          rules: [allConnectedTo('router')],
        },
      ],
      hints: {
        stups: 'Fang mit dem Router an. Er ist in jedem Netzwerk die zentrale Komponente.',
        hinweis:
          'Der Router hat nur wenige Anschlüsse. Häng den Switch an den Router und die ' +
          'drei PCs an den Switch.',
        loesung:
          'Router → Switch (Kabel). Dann jeden der drei PCs per Kabel an den Switch. ' +
          'So braucht der Router nur einen einzigen Anschluss.',
      },
    },
    {
      id: 'm2-internet',
      startFrom: 'previous',
      title: 'Ans Internet anschließen',
      brief:
        'Erweitere das Netz: ein Modem und das Internet kommen dazu. Alle Geräte sollen ' +
        'übers Internet erreichbar sein — aber nur über den Router.',
      ziele: [
        {
          text: 'Internet und Modem sind eingezeichnet',
          rules: [requireCount('internet', 1), requireCount('modem', 1)],
        },
        {
          text: 'Der Router hängt über das Modem am Internet',
          rules: [requireCount('router', 1), routerConnectsToInternet()],
        },
        { text: 'Kein Gerät geht am Router vorbei', rules: [noDeviceBypassesRouter()] },
        { text: 'Alles hängt zusammen', rules: [allConnectedTo('router')] },
      ],
      hints: {
        stups:
          'Die Reihenfolge nach draußen ist immer dieselbe: Gerät → Router → Modem → Internet.',
        hinweis:
          'Das Modem meldet sich beim Provider an, der Router verteilt nach innen. ' +
          'Häng keinen PC direkt ans Internet — sonst wäre er ungeschützt.',
        loesung:
          'Internet → Modem (Kabel), Modem → Router (Kabel). Alle anderen Geräte hängen ' +
          'hinter dem Router.',
      },
    },
    {
      id: 'm2-wlan',
      startFrom: 'previous',
      title: 'Geräte ohne Kabel',
      brief:
        'Bring ein Smartphone und ein Tablet ins Netz. Beide haben keine Netzwerkbuchse — ' +
        'du brauchst einen Access Point.',
      ziele: [
        { text: 'Ein Access Point', rules: [requireCount('accesspoint', 1)] },
        {
          text: 'Ein Smartphone und ein Tablet',
          rules: [requireCount('smartphone', 1), requireCount('tablet', 1)],
        },
        {
          text: 'Alles hängt am Router',
          rules: [requireCount('router', 1), allConnectedTo('router')],
        },
      ],
      hints: {
        stups:
          'Versuch ruhig einmal, das Smartphone per Kabel anzuschließen — der Plan sagt dir, warum das nicht geht.',
        hinweis:
          'Der Access Point selbst braucht ein Kabel zum Router oder Switch. Erst die ' +
          'Geräte danach gehen per WLAN.',
        loesung:
          'Router → Access Point (Kabel). Dann Access Point → Smartphone (WLAN) und ' +
          'Access Point → Tablet (WLAN).',
      },
    },
    {
      id: 'm2-ip',
      startFrom: 'previous',
      title: 'IP-Adressen vergeben',
      brief:
        'Jedes Gerät braucht eine eigene Adresse. Vergib IP-Adressen im selben Netz — ' +
        'zum Beispiel 192.168.178.1 für den Router und dann aufsteigend.',
      ziele: [
        { text: 'Jedes Gerät hat eine IP-Adresse', rules: [everyDeviceHasIp()] },
        { text: 'Keine Adresse ist doppelt', rules: [noDuplicateIps] },
        { text: 'Alle Adressen liegen im selben Netz', rules: [ipsInSameNetwork()] },
        {
          text: 'Alles hängt am Router',
          rules: [requireCount('router', 1), allConnectedTo('router')],
        },
      ],
      hints: {
        stups: 'Klick ein Gerät an — rechts kannst du seine Adresse eintragen.',
        hinweis:
          'Im Heimnetz fangen alle Adressen gleich an, meistens mit 192.168.178. ' +
          'Nur die letzte Zahl unterscheidet die Geräte.',
        loesung:
          'Router 192.168.178.1, dann 192.168.178.20, .21, .22 … für die übrigen Geräte. ' +
          'Der Router vergibt diese Adressen im echten Leben automatisch per DHCP.',
      },
    },
    {
      id: 'm2-zuhause',
      title: 'Dein eigenes Zuhause',
      brief:
        'Zeichne jetzt dein Netzwerk zu Hause: Router, alle Computer, Handys, Konsolen, ' +
        'der Fernseher — was bei dir eben dranhängt. Trag auch die IP-Adressen ein.',
      ziele: [
        {
          text: 'Internet und Router, miteinander verbunden',
          rules: [
            requireCount('internet', 1),
            requireCount('router', 1),
            routerConnectsToInternet(),
          ],
        },
        {
          text: 'Mindestens fünf eigene Geräte',
          rules: [
            (plan) => {
              const own = plan.devices.filter(
                (d) =>
                  !['internet', 'modem', 'router', 'switch', 'accesspoint', 'repeater'].includes(
                    d.type,
                  ),
              )
              if (own.length >= 5) return []
              return [
                {
                  code: 'TOO_FEW_DEVICES',
                  message: `Du hast erst ${own.length} eigene Geräte eingezeichnet.`,
                  why: 'Denk an alles, was bei euch ins Netz geht: Computer, Handys, Tablets, Konsole, Fernseher, Drucker.',
                  deviceIds: [],
                },
              ]
            },
          ],
        },
        {
          text: 'Alles hängt zusammen, niemand geht am Router vorbei',
          rules: [allConnectedTo('router'), noDeviceBypassesRouter()],
        },
        {
          text: 'Jedes Gerät hat seine eigene IP-Adresse',
          rules: [everyDeviceHasIp(), noDuplicateIps, ipsInSameNetwork()],
        },
      ],
      hints: {
        stups: 'Geh in Gedanken durch die Wohnung: Was hängt überall am WLAN?',
        hinweis:
          'Deine echten IP-Adressen findest du heraus, indem du an einem Windows-PC die ' +
          'Kommandozeile öffnest und "ipconfig" eingibst.',
        loesung:
          'Es gibt hier keine einzige richtige Lösung — dein Zuhause sieht anders aus als ' +
          'das deiner Mitschüler. Wichtig ist nur: ein Router als Tor nach draußen, alle ' +
          'Geräte daran, und jedes mit einer eigenen Adresse.',
      },
    },
  ],
}
