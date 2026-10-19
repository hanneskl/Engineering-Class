# Briefing: Modul „Test M2“

## Ziel

Ein zweiter Test im selben Format wie **Test M1** (`src/lessons/t1-test-m1.ts`), diesmal zum Stoff von **M2 – Netzwerk zeichnen**. Die Klasse macht ihn zu Beginn der M3-Stunde.

Die Test-Infrastruktur gibt es schon (`TestLesson`, `TestTask`, Ergebnisseite, Dashboard-Auswertung pro Frage). Diese Aufgabe ist **reiner Inhalt**: eine neue Datei plus ein Eintrag in der Modulliste.

## Umsetzung

1. Neue Datei `src/lessons/t2-test-m2.ts`, aufgebaut wie `t1-test-m1.ts`: dieselben Helfer `ok()`, `no()`, `frage()`, richtige Option jeweils zuerst (der Bildschirm mischt pro Kind).
2. `id: 't2'`, `module: 'T2'`, `title: 'Test M2'`, Aufgaben-IDs `t2-01` … `t2-12`.
3. `quali`- und `intro`-Texte im Ton von Test M1. Intro-Text an das aktuelle Verhalten anpassen (bis zur Abgabe blättern und ändern, dann fest).
4. In `src/lessons/index.ts` den Test **ganz an den Anfang** der Liste setzen, vor Test M1, und den Kommentar dazu ergänzen.
5. Keine Bilder in diesem Test.

## Die Fragen

Jede Option braucht ein `warum` im Ton von Test M1: kurz, freundlich, bei falschen Antworten mit dem Hinweis, was stattdessen stimmt.

| ID | Frage | Richtig | Falsche Optionen (mit Kern des `warum`) |
|---|---|---|---|
| t2-01 | In welcher Reihenfolge geht ein Paket vom PC ins Internet? | PC → Router → Modem → Internet | PC → Modem → Router → Internet (*Router kommt zuerst, das Modem ist die Verbindung zum Provider*) · PC → Switch → Internet (*der Switch verteilt nur im LAN*) · PC → Internet → Router (*der Router steht davor, nicht dahinter*) |
| t2-02 | Der Router hat 4 Anschlüsse, du willst 6 PCs per Kabel anschließen. Was brauchst du zusätzlich? | Einen Switch | Einen Access Point (*verbindet Funkgeräte, keine Kabel-PCs*) · Einen WLAN-Repeater (*verlängert nur das WLAN*) · Ein zweites Modem (*das Modem verbindet mit dem Provider, nicht mit PCs*) |
| t2-03 | Warum soll kein PC direkt am Modem hängen, am Router vorbei? | Er wäre ungeschützt – ohne Router keine Firewall, kein Tor | Er wäre langsamer (*es geht um Schutz, nicht Tempo*) · Er bekäme zwei IP-Adressen (*nein*) · Das ist egal (*doch: der Router trennt dein Netz vom Internet*) |
| t2-04 | Ein Smartphone hat keine Netzwerkbuchse. Wie kommt es ins Netz? | Per WLAN über einen Access Point | Per Kabel an den Switch (*keine Buchse*) · Direkt ans Modem (*am Router vorbei, und ohne Buchse*) · Gar nicht (*doch, per Funk*) |
| t2-05 | Wie ist ein Access Point selbst angeschlossen? | Per Kabel an Router oder Switch | Per WLAN am Router (*das wäre ein Repeater*) · Über das Smartphone (*umgekehrt*) · Gar nicht, er funkt einfach (*er braucht selbst eine Verbindung ins Netz*) |
| t2-06 | In einem Netzwerkschema ist eine Linie gestrichelt. Was bedeutet das? | Eine WLAN-Verbindung | Ein kaputtes Kabel · Die Verbindung ins Internet · Ein Stromkabel (*im Schema: durchgezogen = Kabel, gestrichelt = Funk*) |
| t2-07 | Wer vergibt die IP-Adressen im Heimnetz automatisch? | Der Router, per DHCP | Der Switch (*verteilt Daten, keine Adressen*) · Das Modem (*spricht nur mit dem Provider*) · Jedes Gerät sich selbst (*dann gäbe es doppelte Adressen*) |
| t2-08 | Welche Adresse hat in einem Heimnetz meistens der Router? | 192.168.178.1 | 192.168.178.20 (*so fangen meist die Geräte an*) · 8.8.8.8 (*eine Adresse im Internet*) · 255.255.255.0 (*das ist die Subnetzmaske, keine Adresse*) |
| t2-09 | PC 192.168.178.20, Laptop 192.168.178.21, Smartphone 192.168.178.20. Was stimmt nicht? | Zwei Geräte haben dieselbe Adresse | Der Laptop ist im falschen Netz (*alle beginnen mit 192.168.178*) · Die Zahlen sind zu groß (*bis 255 ist alles gültig*) · Alles stimmt (*PC und Smartphone teilen sich .20*) |
| t2-10 | Im Heimnetz 192.168.178.x hat der Drucker 192.168.1.23. Was ist das Problem? | Er liegt in einem anderen Netz | Die Adresse ist doppelt (*nein*) · Die letzte Zahl ist zu klein (*23 ist erlaubt*) · Kein Problem (*die ersten drei Zahlen müssen bei allen gleich sein*) |
| t2-11 | In der ipconfig-Ausgabe steht „Standardgateway“. Welches Gerät ist das? | Der Router | Der eigene PC (*das ist die IPv4-Adresse*) · Der Internetanbieter (*der steht außerhalb des Heimnetzes*) · Der Switch (*hat im Heimnetz keine Gateway-Rolle*) |
| t2-12 | Welcher Teil von 192.168.178.20 unterscheidet die Geräte im Heimnetz? | Die letzte Zahl (20) | Die erste Zahl (192) · Die ersten drei Zahlen (*die sind bei allen gleich – wie die Straße*) · Alle vier gleichzeitig |

## Fertig ist es, wenn

- `npm test` und `npm run build` grün sind.
- Die vorhandenen Test-Tests auch für Test M2 laufen (jede Option hat ein `warum`, genau eine Option ist richtig). Falls die Tests nur `t1` prüfen, so erweitern, dass sie über alle `kind: 'test'`-Module laufen.
- Test M2 auf der Startseite als erstes Modul erscheint und unter `#/t2` direkt erreichbar ist.
- Committet ist, aber **nicht gepusht**.
