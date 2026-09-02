import type { WebLesson } from '../model/types'
import {
  answered,
  orderedSteps,
  routeWithStations,
  sawStep,
  visitedSites,
  walkedWith,
} from '../model/webRules'

/**
 * M6 — Der Weg einer Internetseite.
 *
 * The third Lehrplan competency word for word: "beschreiben angeleitet die
 * Prozesse von der Eingabe einer URL bis zur Anzeige einer Web-Seite". The
 * student cannot describe a process they have never watched, so here they walk
 * it — from their own machine, with their own addresses, station by station.
 */
export const m6Internetseite: WebLesson = {
  kind: 'web',
  id: 'm6',
  module: 'M6',
  title: 'Der Weg einer Internetseite',
  quali:
    'Der Lehrplan verlangt, den Ablauf von der Eingabe einer URL bis zur Anzeige der ' +
    'Seite zu beschreiben — mit den Fachbegriffen DNS, HTTP-Request, HTTP-Response ' +
    'und dem Unterschied zwischen http und https.',
  intro: {
    heading: 'Was passiert, wenn du Enter drückst?',
    body: [
      'Zwischen deinem Enter und der fertigen Seite liegen sieben Schritte und ein ' +
        'ziemlich weiter Weg. Der Browser kennt nämlich nur den Namen der Seite — ' +
        'verschickt wird im Internet aber ausschließlich an Zahlen, an IP-Adressen.',
      'Deshalb fragt er zuerst beim DNS-Server nach: "Welche IP-Adresse hat google.com?" ' +
        'Erst mit dieser Antwort kann er seinen HTTP-Request losschicken. Der läuft über ' +
        'deinen Router und das Modem hinaus zum Provider und von Station zu Station ' +
        'weiter, bis er beim Webserver ankommt.',
      'Unten läufst du mit. Du siehst bei jeder Station, was im Paket steht — und wer ' +
        'davon etwas mitlesen kann.',
    ],
  },
  tasks: [
    {
      id: 'm6-dns',
      title: 'Wie findet der Browser die Seite?',
      brief:
        'Ruf eine Seite auf und geh mit bis zum DNS-Server und wieder zurück. Schau dir ' +
        'genau an, was du fragst und was zurückkommt.',
      ziele: [
        {
          text: 'Die DNS-Anfrage verschickt',
          rules: [
            sawStep(
              2,
              'Der Browser muss zuerst herausfinden, welche Zahl zum Namen gehört.',
            ),
          ],
        },
        {
          text: 'Die Antwort des DNS-Servers gelesen',
          rules: [
            sawStep(3, 'In der Antwort steht die IP-Adresse, an die das Paket gehen muss.'),
          ],
        },
        {
          text: 'Erklärt, was ein DNS-Server zurückgibt',
          rules: [
            answered(
              'dns',
              'Beantworte die Frage bei Schritt 3.',
              'DNS ist das Telefonbuch des Internets: Name rein, Zahl raus.',
            ),
          ],
        },
      ],
      hints: {
        stups: 'Drück auf "Seite aufrufen" und dann zweimal auf "Weiter".',
        hinweis:
          'Der DNS-Server hängt oben am Weg, weil er ein Umweg ist: Die Frage geht zu ' +
          'ihm hin, die Antwort kommt zu dir zurück. Erst danach geht es zur Seite.',
        loesung:
          'Schritt 2 ist die DNS-Anfrage ("Welche IP-Adresse hat google.com?"), Schritt 3 ' +
          'die Antwort ("google.com = 142.250.185.78"). Ein DNS-Server liefert also die ' +
          'IP-Adresse zu einem Namen — nicht die Seite selbst.',
      },
    },
    {
      id: 'm6-ablauf',
      title: 'Der ganze Weg, Schritt für Schritt',
      brief:
        'Begleite ein Paket einmal komplett: von der Adresszeile bis zur fertigen Seite. ' +
        'Bring danach die sieben Schritte unten in die richtige Reihenfolge.',
      reihenfolge: true,
      ziele: [
        {
          text: 'Das Paket bis zum Webserver begleitet',
          rules: [
            visitedSites(1),
          ],
        },
        {
          text: 'Alle sieben Schritte durchlaufen',
          rules: [sawStep(7, 'Am Ende stellt der Browser die HTML-Seite dar.')],
        },
        { text: 'Die sieben Schritte richtig sortiert', rules: [orderedSteps()] },
      ],
      hints: {
        stups: 'Klick so lange auf "Weiter", bis oben "Schritt 7 von 7" steht.',
        hinweis:
          'Merk dir die Reihenfolge als drei Blöcke: erst den Namen klären (1–3), dann ' +
          'die Anfrage hinschicken (4–5), dann die Antwort bekommen und anzeigen (6–7).',
        loesung:
          '1. URL eingeben, 2. DNS fragen, 3. DNS antwortet mit der IP-Adresse, ' +
          '4. HTTP-Request an diese IP, 5. über Router und Provider zum Server, ' +
          '6. der Server antwortet mit der HTML-Seite, 7. der Browser stellt sie dar.',
      },
    },
    {
      id: 'm6-https',
      title: 'Wer liest mit?',
      brief:
        'Schick dieselbe Anfrage einmal mit http und einmal mit https los. Geh beide ' +
        'Male mit hinaus ins Internet und schau dir an, was im Paket steht.',
      ziele: [
        { text: 'Einmal mit http unterwegs gewesen', rules: [walkedWith('http')] },
        { text: 'Einmal mit https unterwegs gewesen', rules: [walkedWith('https')] },
        {
          text: 'Beide Male erklärt, was ein Mitleser sieht',
          rules: [
            answered(
              'mitleser:http',
              'Beantworte die Mitleser-Frage, während du mit http unterwegs bist.',
              'Bei http ist nichts verschlüsselt.',
            ),
            answered(
              'mitleser:https',
              'Beantworte die Mitleser-Frage noch einmal mit https.',
              'Bei https bleibt nur außen lesbar, wer mit wem redet.',
            ),
          ],
        },
      ],
      hints: {
        stups: 'Links oben in der Adresszeile kannst du zwischen http:// und https:// umschalten.',
        hinweis:
          'Vergleich bei derselben Station, was unter "HTTP-Request" steht. Eine Zeile ' +
          'bleibt immer lesbar — überleg dir, warum das so sein muss.',
        loesung:
          'Bei http steht alles im Klartext: Absender, Ziel und Inhalt. Bei https ist der ' +
          'Inhalt verschlüsselt, Absender und Ziel bleiben lesbar — sonst wüsste kein ' +
          'Router, wohin mit dem Paket. Deshalb gehören Passwörter nur auf https-Seiten.',
      },
    },
    {
      id: 'm6-lan',
      title: 'Vom Heimnetz ins Internet',
      brief:
        'Ruf zwei verschiedene Seiten auf und vergleich die Wege. Finde heraus, wo dein ' +
        'Heimnetz aufhört und das Internet anfängt.',
      ziele: [
        { text: 'Zwei verschiedene Seiten aufgerufen', rules: [visitedSites(2)] },
        {
          text: 'Einen Weg mit mindestens vier Stationen im Internet verfolgt',
          rules: [routeWithStations(4)],
        },
        {
          text: 'Die Grenze zwischen LAN und WAN gefunden',
          rules: [
            answered(
              'grenze',
              'Beantworte die Frage an der letzten Station in deinem Heimnetz.',
              'Alles mit einer 192.168er-Adresse gehört zu dir nach Hause.',
            ),
          ],
        },
      ],
      hints: {
        stups: 'Wechsel oben die Seite und ruf sie noch einmal auf — der Weg ist ein anderer.',
        hinweis:
          'Auf dem Bild sind zwei Bereiche eingefärbt. Die gestrichelte Linie dazwischen ' +
          'ist genau die Grenze, um die es geht.',
        loesung:
          'Bis einschließlich Router und Modem bist du im LAN, deinem Heimnetz mit den ' +
          'privaten Adressen (192.168.…). Ab dem Provider bist du im WAN, dem Internet. ' +
          'Nach außen tritt dabei nur eine einzige Adresse auf — die deines Anschlusses.',
      },
    },
  ],
}
