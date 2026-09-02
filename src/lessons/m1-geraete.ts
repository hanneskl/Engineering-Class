import type { MatchLesson } from '../model/types'
import type { Frage } from '../model/frage'
import type { Zuordnung } from '../model/match'
import {
  allePlatziert,
  alleRichtigZugeordnet,
  answeredMatch,
} from '../model/matchRules'

/**
 * M1 — Geräte & Komponenten kennen.
 *
 * The Quali asks this as a Zuordnung — a column of descriptions, a column of
 * components — so the module is built as one. The sentences in T1.2 are the
 * 2026 exam's own wording, word for word; the same sentences appear in M2's
 * inspector when a device is selected, so a student meets them twice.
 */

const SYMBOLE: Zuordnung = {
  id: 'z-symbole',
  auftrag: 'Welches Gerät steckt hinter welchem Symbol? Zieh jeden Namen auf sein Bild.',
  plaetze: [
    { id: 'p-router', label: 'Router', icon: 'router' },
    { id: 'p-switch', label: 'Switch', icon: 'switch' },
    { id: 'p-ap', label: 'Access Point', icon: 'accesspoint' },
    { id: 'p-repeater', label: 'WLAN-Repeater', icon: 'repeater' },
    { id: 'p-modem', label: 'Modem', icon: 'modem' },
    { id: 'p-server', label: 'Server', icon: 'server' },
    { id: 'p-nas', label: 'NAS', icon: 'nas' },
    { id: 'p-drucker', label: 'Drucker', icon: 'printer' },
  ],
  karten: [
    {
      id: 'k-router',
      text: 'Router',
      platzId: 'p-router',
      warum: 'Das Kästchen mit der Antenne und dem Pfeil nach oben: von hier geht es hinaus.',
    },
    {
      id: 'k-switch',
      text: 'Switch',
      platzId: 'p-switch',
      warum: 'Der flache Kasten mit den vielen Anschlüssen nebeneinander.',
    },
    {
      id: 'k-ap',
      text: 'Access Point',
      platzId: 'p-ap',
      warum: 'Der kleine Kasten mit den Funkwellen — er macht das WLAN auf.',
    },
    {
      id: 'k-repeater',
      text: 'WLAN-Repeater',
      platzId: 'p-repeater',
      warum: 'Funkwellen auf beiden Seiten: er empfängt WLAN und sendet es weiter.',
    },
    {
      id: 'k-modem',
      text: 'Modem',
      platzId: 'p-modem',
      warum: 'Der Kasten mit der Leitung nach oben — das ist die Leitung zum Provider.',
    },
    {
      id: 'k-server',
      text: 'Server',
      platzId: 'p-server',
      warum: 'Der hohe Kasten mit den Einschüben, wie im Rechenzentrum.',
    },
    {
      id: 'k-nas',
      text: 'NAS',
      platzId: 'p-nas',
      warum: 'Der Speicher fürs Netzwerk — außen wie eine Festplatte mit Anschluss.',
    },
    {
      id: 'k-drucker',
      text: 'Drucker',
      platzId: 'p-drucker',
      warum: 'Mit dem Blatt Papier, das oben herauskommt.',
    },
  ],
}

const FUNKTIONEN: Zuordnung = {
  id: 'z-funktion',
  auftrag: 'Welcher Satz beschreibt welches Gerät? Genau so wird es im Quali gefragt.',
  plaetze: [
    { id: 'f-router', label: 'Router' },
    { id: 'f-switch', label: 'Switch' },
    { id: 'f-ap', label: 'Access Point' },
    { id: 'f-repeater', label: 'WLAN-Repeater' },
    { id: 'f-modem', label: 'Modem' },
    { id: 'f-firewall', label: 'Firewall' },
    { id: 'f-server', label: 'Server / NAS' },
  ],
  karten: [
    {
      id: 'kf-router',
      text: 'Leitet Daten zwischen verschiedenen Netzwerken weiter, meist zwischen Heimnetz und Internet.',
      platzId: 'f-router',
      warum:
        'Das ist der Router. Das Wort "zwischen Netzwerken" ist der Hinweis: er steht an der Grenze.',
    },
    {
      id: 'kf-switch',
      text: 'Verbindet mehrere Geräte in einem kabelgebundenen Netzwerk (LAN) miteinander.',
      platzId: 'f-switch',
      warum:
        'Das ist der Switch. Er verteilt innerhalb eines Netzes per Kabel — nach draußen geht er nicht.',
    },
    {
      id: 'kf-ap',
      text: 'Verbindet kabellose Geräte (WLAN) mit einem kabelgebundenen Netzwerk (LAN).',
      platzId: 'f-ap',
      warum:
        'Das ist der Access Point: das Bindeglied zwischen Funk und Kabel. Er selbst hängt am Kabel.',
    },
    {
      id: 'kf-repeater',
      text: 'Spezieller Access Point, der selbst per WLAN und nicht per Kabel mit dem Router verbunden ist.',
      platzId: 'f-repeater',
      warum:
        'Das ist der Repeater. Der Unterschied zum Access Point steckt in "selbst per WLAN verbunden".',
    },
    {
      id: 'kf-modem',
      text: 'Authentifiziert sich beim Provider und stellt die Internetverbindung her.',
      platzId: 'f-modem',
      warum:
        'Das ist das Modem. Es meldet den Anschluss beim Anbieter an — ohne das kommt gar keine Leitung zustande.',
    },
    {
      id: 'kf-firewall',
      text: 'Schützt einen Computer oder ein Netzwerk vor unerwünschten Zugriffen von innen oder außen.',
      platzId: 'f-firewall',
      warum:
        'Das ist die Firewall. Sie transportiert nichts, sie entscheidet, was durchdarf.',
    },
    {
      id: 'kf-server',
      text: 'Stellt Dienste oder Speicherplatz im Netzwerk bereit.',
      platzId: 'f-server',
      warum:
        'Das ist der Server beziehungsweise das NAS. Sie bieten etwas an, das andere Geräte nutzen.',
    },
  ],
}

const CLIENT_SERVER: Zuordnung = {
  id: 'z-client-server',
  auftrag: 'Wer nutzt einen Dienst, wer bietet ihn an? Sortier die Geräte in die zwei Kästen.',
  mehrfach: true,
  plaetze: [
    { id: 'cs-client', label: 'Client', sub: 'nutzt einen Dienst' },
    { id: 'cs-server', label: 'Server', sub: 'bietet einen Dienst an' },
  ],
  karten: [
    {
      id: 'cs-pc',
      text: 'PC im Klassenzimmer',
      platzId: 'cs-client',
      warum: 'Er ruft Seiten auf und druckt — er fragt also andere um etwas.',
    },
    {
      id: 'cs-laptop',
      text: 'Dein Laptop',
      platzId: 'cs-client',
      warum: 'Auch ein Client: er nutzt, was andere anbieten.',
    },
    {
      id: 'cs-handy',
      text: 'Smartphone',
      platzId: 'cs-client',
      warum: 'Nutzt Dienste (Web, Chat, Streaming), bietet selbst keine an.',
    },
    {
      id: 'cs-konsole',
      text: 'Spielkonsole',
      platzId: 'cs-client',
      warum: 'Sie verbindet sich zum Spieleserver — der Server steht woanders.',
    },
    {
      id: 'cs-web',
      text: 'Webserver von wikipedia.org',
      platzId: 'cs-server',
      warum: 'Er liefert Seiten aus, sobald jemand fragt. Das ist ein Dienst.',
    },
    {
      id: 'cs-nas',
      text: 'NAS im Keller',
      platzId: 'cs-server',
      warum: 'Es bietet Speicherplatz an, auf den alle im Netz zugreifen.',
    },
    {
      id: 'cs-dns',
      text: 'DNS-Server beim Provider',
      platzId: 'cs-server',
      warum: 'Er beantwortet Fragen nach IP-Adressen — auch das ist ein Dienst.',
    },
    {
      id: 'cs-drucker',
      text: 'Netzwerkdrucker',
      platzId: 'cs-server',
      warum:
        'Ungewohnt, aber richtig: Er bietet den Dienst "Drucken" an und wartet darauf, dass jemand ihn nutzt.',
    },
  ],
}

const NETZE: Zuordnung = {
  id: 'z-netze',
  auftrag: 'Sortier die vier Netzwerktypen nach ihrer Größe — das kleinste zuerst.',
  rang: true,
  plaetze: [
    { id: 'n1', label: 'am kleinsten' },
    { id: 'n2', label: 'größer' },
    { id: 'n3', label: 'noch größer' },
    { id: 'n4', label: 'am größten' },
  ],
  karten: [
    {
      id: 'n-lan',
      text: 'LAN — Local Area Network',
      platzId: 'n1',
      warum: 'Ein Gebäude oder eine Wohnung: euer Computerraum ist ein LAN.',
    },
    {
      id: 'n-man',
      text: 'MAN — Metropolitan Area Network',
      platzId: 'n2',
      warum: 'Eine Stadt. Zum Beispiel alle Schulen einer Stadt, die zusammenhängen.',
    },
    {
      id: 'n-wan',
      text: 'WAN — Wide Area Network',
      platzId: 'n3',
      warum: 'Über Städte und Länder hinweg — was hinter deinem Router anfängt.',
    },
    {
      id: 'n-gan',
      text: 'GAN — Global Area Network',
      platzId: 'n4',
      warum: 'Die ganze Welt. Das Internet ist das bekannteste GAN.',
    },
  ],
}

const FRAGEN: Frage[] = [
  {
    id: 'wlan',
    text: 'Was ist der Unterschied zwischen einem LAN und einem WLAN?',
    optionen: [
      {
        text: 'Ein WLAN ist ein LAN ohne Kabel',
        ok: true,
        warum:
          'Richtig. Das W steht für "wireless". Größe und Zweck sind dieselben, nur die Leitung fehlt.',
      },
      {
        text: 'Ein WLAN ist größer als ein LAN',
        ok: false,
        warum:
          'Nein, mit der Größe hat es nichts zu tun — dafür sind MAN, WAN und GAN da.',
      },
      {
        text: 'WLAN ist ein anderes Wort für Internet',
        ok: false,
        warum:
          'Ein häufiger Irrtum: Das WLAN reicht nur bis zur Wohnungstür. Das Internet fängt hinter dem Router an.',
      },
    ],
  },
  {
    id: 'stecker',
    text: 'Wie heißt der Stecker am Ende eines Netzwerkkabels?',
    optionen: [
      {
        text: 'RJ-45',
        ok: true,
        warum: 'Richtig. Sieht aus wie ein breiter Telefonstecker und rastet mit einer Nase ein.',
      },
      {
        text: 'USB-C',
        ok: false,
        warum: 'Damit lädst du dein Handy. Netzwerkkabel haben den größeren, eckigen RJ-45.',
      },
      {
        text: 'HDMI',
        ok: false,
        warum: 'Das ist für Bild und Ton zum Fernseher. Gesucht ist RJ-45.',
      },
    ],
  },
  {
    id: 'adern',
    text: 'Wie viele Adern stecken in einem normalen Netzwerkkabel?',
    optionen: [
      {
        text: '8, jeweils zu zweit verdrillt',
        ok: true,
        warum:
          'Richtig: 8 Adern als 4 verdrillte Paare. Das Verdrillen verringert Störungen von außen.',
      },
      {
        text: '2, wie beim Telefon',
        ok: false,
        warum: 'Zu wenig. Es sind 8 — vier Paare, jedes für sich verdrillt.',
      },
      {
        text: '16, für jede Richtung acht',
        ok: false,
        warum: 'Zu viele. Acht Adern reichen, weil sie paarweise verdrillt sind.',
      },
    ],
  },
  {
    id: 'ports',
    text:
      'In einem Raum sollen 6 PCs und ein Drucker per Kabel an einen Switch, und der Switch ' +
      'ans Netz. Reicht ein Switch mit 8 Anschlüssen?',
    optionen: [
      {
        text: 'Ja, und es bleibt kein Anschluss übrig',
        ok: true,
        warum:
          'Richtig gerechnet: 6 PCs + 1 Drucker + 1 Kabel zum Router = 8. Es passt genau, aber eng — ein Gerät mehr geht nicht.',
      },
      {
        text: 'Ja, zwei Anschlüsse bleiben frei',
        ok: false,
        warum:
          'Ein Anschluss wird leicht vergessen: der Switch braucht selbst noch ein Kabel zum Router.',
      },
      {
        text: 'Nein, es fehlen zwei Anschlüsse',
        ok: false,
        warum: 'Zähl noch einmal: 6 + 1 + 1 = 8. Es reicht — gerade so.',
      },
    ],
  },
]

const frage = (id: string): Frage => FRAGEN.find((f) => f.id === id)!

export const m1Geraete: MatchLesson = {
  kind: 'match',
  id: 'm1',
  module: 'M1',
  title: 'Geräte & Komponenten',
  quali:
    'Fast jeder Quali beginnt mit einer Zuordnung: Beschreibung links, Gerät rechts. ' +
    'Dazu kommen die Netzwerktypen (LAN, MAN, WAN, GAN), der Steckertyp RJ-45 und ' +
    'die Frage, wie viele Anschlüsse ein Switch braucht.',
  intro: {
    heading: 'Wer macht was im Netzwerk?',
    body: [
      'Ein Netzwerk besteht aus wenigen Bauteilen, und jedes hat genau eine Aufgabe. ' +
        'Wer die sieben Sätze auf dieser Seite kann, hat den ersten Teil des Quali sicher.',
      'Achte besonders auf die Paare, die leicht zu verwechseln sind: Switch und Access ' +
        'Point verteilen beide — der eine per Kabel, der andere per Funk. Access Point und ' +
        'Repeater machen beide WLAN — aber der Repeater hängt selbst im WLAN statt am Kabel.',
      'Die Symbole unten sind dieselben, die du im Netzwerkplaner benutzt.',
    ],
  },
  tasks: [
    {
      id: 'm1-symbole',
      title: 'Die Symbole erkennen',
      brief:
        'Acht Symbole, acht Namen. Klick einen Namen an und dann das Bild, zu dem er gehört.',
      zuordnung: SYMBOLE,
      ziele: [
        { text: 'Alle acht Namen abgelegt', rules: [allePlatziert(SYMBOLE)] },
        { text: 'Jeder Name auf dem richtigen Symbol', rules: [alleRichtigZugeordnet(SYMBOLE)] },
      ],
      hints: {
        stups: 'Fang mit den Geräten an, die du sicher kennst — der Rest wird dann weniger.',
        hinweis:
          'Router und Modem sehen sich ähnlich. Das Modem hat die Leitung nach draußen, ' +
          'der Router den Pfeil und die Antenne.',
        loesung:
          'Von links nach rechts: Router (Antenne), Switch (viele Anschlüsse), Access Point ' +
          '(Funkwellen), Repeater (Funk auf beiden Seiten), Modem (Leitung nach oben), ' +
          'Server (hoher Kasten), NAS (Speicher), Drucker (Blatt Papier).',
      },
    },
    {
      id: 'm1-funktion',
      title: 'Die Aufgabe jedes Geräts',
      brief:
        'Sieben Sätze, sieben Geräte — im Wortlaut der Prüfung. Ordne jeden Satz seinem Gerät zu.',
      zuordnung: FUNKTIONEN,
      ziele: [
        { text: 'Alle sieben Sätze abgelegt', rules: [allePlatziert(FUNKTIONEN)] },
        { text: 'Jeder Satz beim richtigen Gerät', rules: [alleRichtigZugeordnet(FUNKTIONEN)] },
      ],
      hints: {
        stups: 'Zwei Sätze reden von Kabel, zwei von Funk. Sortier erst nach diesem Merkmal.',
        hinweis:
          'Der Unterschied zwischen Access Point und Repeater steht im Satz selbst: ' +
          '"selbst per WLAN verbunden" kann nur der Repeater sein.',
        loesung:
          'Router = zwischen Netzwerken. Switch = Geräte im LAN per Kabel. Access Point = ' +
          'WLAN-Geräte ans Kabelnetz. Repeater = Access Point, der selbst per WLAN hängt. ' +
          'Modem = meldet sich beim Provider an. Firewall = schützt vor Zugriffen. ' +
          'Server/NAS = stellt Dienste und Speicher bereit.',
      },
    },
    {
      id: 'm1-client-server',
      title: 'Client oder Server?',
      brief:
        'Ein Client nutzt einen Dienst, ein Server bietet ihn an. Sortier die acht Geräte ein — ' +
        'eines davon überrascht dich vielleicht.',
      zuordnung: CLIENT_SERVER,
      ziele: [
        { text: 'Alle Geräte einsortiert', rules: [allePlatziert(CLIENT_SERVER)] },
        { text: 'Alle im richtigen Kasten', rules: [alleRichtigZugeordnet(CLIENT_SERVER)] },
      ],
      hints: {
        stups: 'Frag dich bei jedem Gerät: Wartet es darauf, gefragt zu werden — oder fragt es?',
        hinweis:
          'Es kommt nicht auf die Größe an. Auch ein kleines Gerät ist ein Server, wenn es ' +
          'einen Dienst anbietet.',
        loesung:
          'Clients: PC, Laptop, Smartphone, Konsole — sie fragen. Server: Webserver, NAS, ' +
          'DNS-Server und der Netzwerkdrucker — sie bieten an und warten. Der Drucker ist ' +
          'der überraschende: sein Dienst heißt "Drucken".',
      },
    },
    {
      id: 'm1-netze',
      title: 'LAN, WAN und der Rest',
      brief:
        'Vier Netzwerktypen, vom kleinsten zum größten. Danach eine Frage, bei der sich viele vertun.',
      zuordnung: NETZE,
      fragen: [frage('wlan')],
      ziele: [
        { text: 'Alle vier Typen einsortiert', rules: [allePlatziert(NETZE)] },
        { text: 'Reihenfolge nach Größe richtig', rules: [alleRichtigZugeordnet(NETZE)] },
        {
          text: 'LAN und WLAN auseinandergehalten',
          rules: [
            answeredMatch(
              'wlan',
              'Beantworte die Frage unter der Tafel.',
              'Überleg, wofür das W steht.',
            ),
          ],
        },
      ],
      hints: {
        stups: 'Die Abkürzungen verraten es: local, metropolitan, wide, global.',
        hinweis:
          'Local = ein Gebäude. Metropolitan = eine Stadt. Wide = über Länder. Global = die Welt.',
        loesung:
          'LAN (Gebäude) → MAN (Stadt) → WAN (Länder) → GAN (Welt, also das Internet). ' +
          'Ein WLAN ist dabei keine eigene Größe, sondern ein LAN ohne Kabel.',
      },
    },
    {
      id: 'm1-kabel',
      title: 'Kabel, Stecker, Anschlüsse',
      brief:
        'Drei Fragen zum Netzwerkkabel und zur Frage, wie viele Anschlüsse ein Switch haben muss.',
      fragen: [frage('stecker'), frage('adern'), frage('ports')],
      ziele: [
        {
          text: 'Den Steckertyp benannt',
          rules: [
            answeredMatch('stecker', 'Beantworte die Frage nach dem Stecker.', 'Er heißt nach einer Norm, nicht nach einer Firma.'),
          ],
        },
        {
          text: 'Gewusst, wie viele Adern im Kabel stecken',
          rules: [
            answeredMatch('adern', 'Beantworte die Frage nach den Adern.', 'Sie liegen paarweise verdrillt im Kabel.'),
          ],
        },
        {
          text: 'Die Anschlüsse richtig gezählt',
          rules: [
            answeredMatch(
              'ports',
              'Beantworte die Frage zum Switch.',
              'Vergiss das Kabel nicht, mit dem der Switch selbst am Netz hängt.',
            ),
          ],
        },
      ],
      hints: {
        stups: 'Bei der letzten Frage: zeichne die Geräte kurz auf und zähl die Kabel.',
        hinweis:
          'Jedes Gerät belegt einen Anschluss — und der Switch braucht selbst einen für den ' +
          'Weg zum Router.',
        loesung:
          'Der Stecker heißt RJ-45. Im Kabel liegen 8 Adern als 4 verdrillte Paare. ' +
          'Und 6 PCs + 1 Drucker + 1 Uplink zum Router = 8 Anschlüsse: ein 8er-Switch reicht ' +
          'genau, ein Gerät mehr passt nicht.',
      },
    },
  ],
}
