import type { TestLesson, TestTask } from '../model/types'
import type { Option } from '../model/frage'

/**
 * Mini-Quali Teil A — sixteen questions across M1 to M6, for the stocktake
 * after the autumn holidays (Downloads briefing „Mini-Quali"). Four of them
 * (t5-07 … t5-10) are Knobelfragen on things the class looks at closely
 * right afterwards. Teil B is the spreadsheet lesson t6; Teil C, the Scratch
 * bug hunt, happens on paper and in Scratch.
 *
 * Called t5 although Test M5 (t4) is not built yet — it keeps its number.
 * Same shape as the other tests: one right option, listed first, and a
 * `warum` on every option.
 */

const ok = (text: string, warum: string): Option => ({ text, ok: true, warum })
const no = (text: string, warum: string): Option => ({ text, ok: false, warum })

const frage = (id: string, text: string, optionen: Option[]): TestTask => ({
  id,
  frage: { id, text, optionen },
})

/** The same printout for t5-11 and t5-12. */
const IPCONFIG = [
  'IPv4-Adresse . . . : 192.168.178.34',
  'Subnetzmaske . . . : 255.255.255.0',
  'Standardgateway . . : 192.168.178.1',
].join('\n')

const TASKS: TestTask[] = [
  // Teil A — Geräte und Netze
  frage('t5-01', 'Welches Gerät verbindet dein Heimnetz mit dem Internet?', [
    ok('Der Router', 'Richtig — der Router steht an der Grenze zwischen deinem Netz und dem Internet.'),
    no('Der Switch', 'Der Switch verbindet Geräte im selben Netz. Nach draußen geht es über den Router.'),
    no('Der WLAN-Repeater', 'Der Repeater verlängert nur den Funk. Ins Internet verbindet der Router.'),
    no('Der Drucker', 'Der Drucker ist nur ein Gerät im Netz. Die Verbindung nach draußen macht der Router.'),
  ]),
  frage('t5-02', 'Was ist ein Server?', [
    ok('Ein Computer, der anderen Geräten etwas anbietet, z. B. Webseiten oder Dateien', 'Genau — ein Server bietet einen Dienst an und wartet, bis jemand ihn nutzt.'),
    no('Ein besonders schneller Computer', 'Es geht ums Anbieten, nicht ums Tempo. Ein Server bietet anderen Geräten etwas an.'),
    no('Das Kabel vom Router zur Wand', 'Das ist die Leitung. Ein Server ist ein Computer, der etwas anbietet.'),
    no('Das Programm, mit dem man surft', 'Das ist der Browser, und der ist ein Client. Der Server bietet die Webseite an.'),
  ]),
  frage('t5-03', 'Was macht ein Switch?', [
    ok('Er verbindet Geräte im selben Netz per Kabel und schickt jedes Paket nur an das richtige Gerät', 'Richtig — der Switch verteilt innerhalb deines Netzes, gezielt an das Gerät, für das ein Paket bestimmt ist.'),
    no('Er verbindet das Netz mit dem Internet', 'Das ist der Router. Der Switch bleibt im eigenen Netz.'),
    no('Er verstärkt das WLAN', 'Das ist der Repeater. Der Switch verbindet Geräte per Kabel.'),
    no('Er übersetzt Namen in IP-Adressen', 'Das ist DNS. Der Switch verteilt Pakete im eigenen Netz.'),
  ]),
  frage('t5-04', 'Was ist der Unterschied zwischen LAN und WLAN?', [
    ok('LAN geht über Kabel, WLAN über Funk', 'Genau — das W steht für „wireless“, also kabellos.'),
    no('LAN ist das Internet, WLAN das Heimnetz', 'Beides sind Netze im Haus. LAN geht über Kabel, WLAN über Funk.'),
    no('WLAN ist immer schneller', 'Andersherum: Kabel ist meist schneller und stabiler. LAN = Kabel, WLAN = Funk.'),
    no('LAN gibt es nur in Firmen', 'Auch zu Hause: Jedes Netzwerkkabel ist LAN. WLAN ist dasselbe über Funk.'),
  ]),

  // Teil B — Adressen
  frage('t5-05', 'Welche IPv4-Adresse ist gültig?', [
    ok('192.168.1.20', 'Richtig — vier Blöcke, jeder zwischen 0 und 255.'),
    no('192.168.1.300', 'Kein Block darf über 255 liegen. Gültig ist 192.168.1.20.'),
    no('192.168.1', 'Es fehlt ein Block — es müssen vier sein. Gültig ist 192.168.1.20.'),
    no('00:1A:2B:3C:4D:5E', 'Das ist eine MAC-Adresse. Eine IPv4-Adresse hat vier Zahlen mit Punkten.'),
  ]),
  frage('t5-06', 'Was stimmt über die MAC-Adresse?', [
    ok('Sie ist fest in die Netzwerkkarte eingebaut und ändert sich nicht', 'Genau — der Hersteller vergibt sie, und sie bleibt immer gleich.'),
    no('Der Router vergibt sie jeden Tag neu', 'Das ist die IP-Adresse. Die MAC-Adresse steckt fest in der Netzwerkkarte.'),
    no('Sie besteht aus vier Zahlen bis 255', 'Das ist IPv4. Eine MAC-Adresse hat sechs Paare aus Ziffern und A–F.'),
    no('Sie verrät, wo auf der Welt das Gerät steht', 'Sie verrät nur den Hersteller. Fest ist sie trotzdem: Sie steckt in der Netzwerkkarte.'),
  ]),

  // Teil C — Knobelfragen
  frage('t5-07', 'Knobelfrage: Maske 255.255.255.0, Adresse 192.168.178.20. Welcher Teil steht für das Gerät (Hostanteil)?', [
    ok('20', 'Richtig — die ersten drei Blöcke sind das Netz, die letzte Zahl ist das Gerät.'),
    no('192.168.178', 'Das ist der Netzanteil, bei allen im Netz gleich. Das Gerät ist die 20.'),
    no('192', 'Der erste Block gehört zum Netz. Für das Gerät steht die letzte Zahl, 20.'),
    no('255', 'Die 255 steht in der Maske, nicht in der Adresse. Das Gerät ist die 20.'),
  ]),
  frage('t5-08', 'Knobelfrage: Maske 255.255.255.0. Welche zwei Geräte sind im selben Netz?', [
    ok('192.168.178.20 und 192.168.178.45', 'Genau — die ersten drei Blöcke sind gleich, nur das Gerät ist ein anderes.'),
    no('192.168.178.20 und 192.168.179.20', 'Der dritte Block ist anders, also ist es ein anderes Netz.'),
    no('10.0.0.5 und 192.168.0.5', 'Die ersten drei Blöcke sind verschieden — das sind zwei verschiedene Netze.'),
    no('192.168.1.1 und 192.168.10.1', 'Im dritten Block steht einmal 1 und einmal 10, also ein anderes Netz.'),
  ]),
  frage('t5-09', 'Knobelfrage: Welche Adresse gibt es nur im Heimnetz (private Adresse)?', [
    ok('192.168.0.15', 'Richtig — private Adressen gibt es in drei Bereichen: 10.…, 172.16.… bis 172.31.… und 192.168.….'),
    no('8.8.8.8', 'Das ist der öffentliche DNS-Server von Google. Privat ist 192.168.0.15.'),
    no('185.15.59.224', 'Das ist Wikipedia, im Internet erreichbar. Privat ist 192.168.0.15.'),
    no('142.250.185.78', 'Das ist ein Google-Server im Internet. Privat ist 192.168.0.15.'),
  ]),
  frage('t5-10', 'Knobelfrage: Wer gibt im Heimnetz den Geräten automatisch ihre IP-Adresse?', [
    ok('Der Router (DHCP)', 'Genau — der Router vergibt sie per DHCP. Drucker und Server bekommen oft eine feste (statische) Adresse, damit man sie immer wiederfindet.'),
    no('Der DNS-Server', 'Der übersetzt nur Namen in Adressen. Vergeben tut sie der Router per DHCP.'),
    no('Der Switch', 'Der Switch leitet nur weiter. Die Adressen vergibt der Router per DHCP.'),
    no('Jedes Gerät denkt sich selbst eine aus', 'Dann gäbe es doppelte Adressen. Deshalb vergibt sie der Router zentral per DHCP.'),
  ]),

  // Teil D — ipconfig, Befehle, Internet
  {
    ...frage('t5-11', 'Ausschnitt aus ipconfig — welche Adresse hat hier der Router?', [
      ok('192.168.178.1', 'Richtig — der Router steht als „Standardgateway“ in der Ausgabe.'),
      no('192.168.178.34', 'Das ist der eigene PC, die Zeile „IPv4-Adresse“. Der Router ist das Standardgateway.'),
      no('255.255.255.0', 'Das ist die Maske, keine Adresse. Der Router ist das Standardgateway: 192.168.178.1.'),
      no('Das steht hier nicht', 'Doch, beim Standardgateway: 192.168.178.1.'),
    ]),
    ausschnitt: IPCONFIG,
  },
  {
    ...frage('t5-12', 'Ausschnitt aus ipconfig — mit welchem Befehl prüfst du, ob der Router antwortet?', [
      ok('ping 192.168.178.1', 'Genau — ping schickt ein kleines Paket an den Router und wartet auf die Antwort.'),
      no('ping 255.255.255.0', 'Die Maske ist kein Gerät. Pingen musst du den Router, 192.168.178.1.'),
      no('ipconfig 192.168.178.1', 'ipconfig zeigt nur die Einstellungen des eigenen PCs. Ob der Router antwortet, prüft ping.'),
      no('tracert 192.168.178.34', 'Das ist der eigene PC. Ob der Router antwortet, prüfst du mit ping 192.168.178.1.'),
    ]),
    ausschnitt: IPCONFIG,
  },
  frage('t5-13', 'Was macht der DNS-Server?', [
    ok('Er übersetzt Namen wie wikipedia.org in die IP-Adresse', 'Richtig — wie ein Telefonbuch: Name rein, Nummer raus.'),
    no('Er speichert alle Webseiten', 'Das machen die Webserver. Der DNS-Server übersetzt Namen in IP-Adressen.'),
    no('Er verschlüsselt die Verbindung', 'Das macht https. Der DNS-Server übersetzt Namen in IP-Adressen.'),
    no('Er gibt den Geräten im Heimnetz ihre Adresse', 'Das macht der Router per DHCP. Der DNS-Server übersetzt Namen.'),
  ]),
  frage('t5-14', 'Was bedeutet das „s“ in https?', [
    ok('Die Verbindung ist verschlüsselt, Mitlesende sehen nur Zeichensalat', 'Genau — s steht für „secure“: Unterwegs kann niemand mitlesen.'),
    no('Die Seite ist frei von Viren', 'https schützt nur den Weg, nicht den Inhalt. Es heißt: Die Verbindung ist verschlüsselt.'),
    no('Die Seite lädt schneller', 's heißt „secure“, nicht „speed“. Die Verbindung ist verschlüsselt.'),
    no('Der Staat hat die Seite geprüft', 'Jede Seite kann https haben. Es heißt nur: Die Verbindung ist verschlüsselt.'),
  ]),
  frage('t5-15', 'Welche Reihenfolge stimmt, wenn du eine Webseite aufrufst?', [
    ok('Adresse eintippen → DNS fragen → Anfrage an den Webserver → Seite kommt zurück', 'Richtig — erst den Namen in eine IP übersetzen, dann den Webserver fragen, dann kommt die Seite.'),
    no('Adresse eintippen → Anfrage an den Webserver → DNS fragen → Seite kommt zurück', 'Ohne DNS weiß der Browser die IP noch nicht — er kann den Webserver noch gar nicht fragen.'),
    no('DNS fragen → Adresse eintippen → Anfrage an den Webserver → Seite kommt zurück', 'Der DNS-Server kann erst übersetzen, wenn du die Adresse eingetippt hast.'),
    no('Adresse eintippen → DNS fragen → Seite kommt zurück → Anfrage an den Webserver', 'Die Seite kommt erst, nachdem der Browser den Webserver gefragt hat.'),
  ]),
  frage('t5-16', 'Warum wird eine große Datei in viele kleine Pakete zerlegt?', [
    ok('Kleine Pakete reisen einzeln; geht eins verloren, wird nur dieses neu geschickt', 'Genau — so muss nicht die ganze Datei noch einmal los, wenn unterwegs etwas fehlt.'),
    no('Damit die Datei kleiner wird', 'Das wäre Zippen. Die Pakete zusammen sind genauso groß wie die Datei.'),
    no('Damit niemand mitlesen kann', 'Dafür braucht es Verschlüsselung. Pakete sorgen dafür, dass nur Verlorenes neu geschickt wird.'),
    no('Weil ein Kabel nur einen Buchstaben auf einmal schafft', 'Ein Paket enthält viele Zeichen. Zerlegt wird, damit nur Verlorenes neu geschickt werden muss.'),
  ]),
]

export const t5MiniQuali: TestLesson = {
  kind: 'test',
  id: 't5',
  module: 'T5',
  title: 'Mini-Quali Teil A',
  quali: 'Alles aus M1 bis M6 auf einmal – so gemischt kommt es auch in der Quali.',
  intro: {
    heading: 'Mini-Quali: Wo stehst du?',
    body: [
      '16 Fragen, etwa 15 Minuten. Es gibt keine Hinweise.',
      'Vier Fragen sind Knobelfragen zu Dingen, die wir gleich danach genauer anschauen – nachdenken lohnt sich.',
      'Bis zur Abgabe kannst du zwischen den Fragen blättern und Antworten ändern — danach stehen sie fest.',
      'Ob eine Antwort richtig war, siehst du erst am Ende — dann aber für jede Frage, mit Erklärung.',
    ],
  },
  tasks: TASKS,
}
