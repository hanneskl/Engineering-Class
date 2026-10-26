# Briefing: Modul „Test M3“

## Ziel

Ein dritter Test im selben Format wie **Test M1** und **Test M2** (`src/lessons/t1-test-m1.ts`, `src/lessons/t2-test-m2.ts`), diesmal zum Stoff von **M3 – Adressen im Netzwerk**. Die Klasse macht ihn zu Beginn der M5-Stunde.

Die Test-Infrastruktur gibt es schon. Diese Aufgabe ist **reiner Inhalt**: eine neue Datei plus ein Eintrag in der Modulliste.

## Umsetzung

1. Neue Datei `src/lessons/t3-test-m3.ts`, aufgebaut wie `t2-test-m2.ts`: dieselben Helfer `ok()`, `no()`, `frage()`, richtige Option jeweils zuerst (der Bildschirm mischt pro Kind).
2. `id: 't3'`, `module: 'T3'`, `title: 'Test M3'`, Aufgaben-IDs `t3-01` … `t3-12`.
3. `quali`- und `intro`-Texte im Ton von Test M2.
4. In `src/lessons/index.ts` den Test **ganz an den Anfang** der Liste setzen, vor Test M2, und den Kommentar dazu ergänzen.
5. Keine Bilder. Frage t3-11 enthält einen mehrzeiligen ipconfig-Ausschnitt: so darstellen, wie die Frage-Komponente mehrzeiligen Text kann (Zeilenumbrüche, wenn möglich Monospace). Falls das nicht geht, die drei Zeilen mit „ · “ getrennt in eine Zeile schreiben.

## Die Fragen

Jede Option braucht ein `warum` im Ton der bisherigen Tests: kurz, freundlich, bei falschen Antworten mit dem Hinweis, was stattdessen stimmt.

| ID | Frage | Richtig | Falsche Optionen (mit Kern des `warum`) |
|---|---|---|---|
| t3-01 | Wozu braucht jedes Gerät im Netzwerk eine IP-Adresse? | Damit Pakete das richtige Gerät finden | Damit es schneller surft (*die Adresse macht nichts schneller*) · Damit es WLAN empfangen kann (*Funk geht auch ohne, aber ohne Adresse kommt kein Paket an*) · Damit man es im Laden erkennt (*das wäre eher die Seriennummer*) |
| t3-02 | Aus wie vielen Zahlenblöcken besteht eine IPv4-Adresse? | 4 | 3 (*es sind vier, z. B. 192.168.178.20*) · 6 (*sechs Gruppen hat die MAC-Adresse*) · 8 (*vier Blöcke, durch Punkte getrennt*) |
| t3-03 | Welche Zahlen sind in einem Block erlaubt? | 0 bis 255 | 1 bis 100 · 0 bis 999 (*größer als 255 geht nicht*) · 1 bis 1000 (*jeder Block geht nur bis 255*) |
| t3-04 | Welche Adresse ist **ungültig**? | 192.168.178.300 | 10.0.0.1 · 84.153.12.7 · 192.168.0.254 (*alle Blöcke liegen zwischen 0 und 255; nur 300 ist zu groß*) |
| t3-05 | Welche Adresse kommt aus einem Heimnetz? | 192.168.178.34 | 84.153.12.7 (*eine externe Adresse vom Anbieter*) · 8.8.8.8 (*ein Server im Internet*) · 142.250.185.78 (*ein Server von Google*) – Kern: *Heimnetze beginnen meist mit 192.168* |
| t3-06 | Laptop, Handy und Konsole surfen gleichzeitig. Welche Adresse sieht die Webseite? | Bei allen dreien dieselbe: die externe Adresse des Routers | Drei verschiedene 192.168-Adressen (*private Adressen verlassen das Heimnetz nie*) · Die MAC-Adressen der Geräte (*die bleiben im Heimnetz*) · Gar keine (*ohne Adresse käme keine Antwort zurück*) |
| t3-07 | Der Router ist wie die Rezeption eines Hotels. Was entspricht den Zimmernummern? | Die privaten Adressen der Geräte im Heimnetz | Die externe Adresse (*das ist die Hoteladresse für die Post*) · Die MAC-Adressen (*die sind eher wie Fingerabdrücke der Gäste*) · Die Webseiten (*die sind draußen, nicht im Hotel*) |
| t3-08 | Was ist eine MAC-Adresse? | Die feste Nummer der Netzwerkkarte, vom Hersteller vergeben | Eine Adresse nur für Apple-Geräte (*MAC hat nichts mit Apple zu tun*) · Die Adresse, die der Router per DHCP verteilt (*das ist die IP-Adresse*) · Die Adresse des Routers im Internet (*das ist die externe Adresse*) |
| t3-09 | Welche dieser Angaben ist eine MAC-Adresse? | 3C-5A-B4-1F-08-9D | 192.168.178.20 (*eine IP-Adresse*) · 255.255.255.0 (*die Subnetzmaske*) · www.apple.com (*ein Name einer Webseite*) – Kern: *sechs Zweiergruppen aus Ziffern und A–F* |
| t3-10 | Du nimmst deinen Laptop mit in die Schule und gehst dort ins WLAN. Was passiert mit den Adressen? | Die IP-Adresse ändert sich, die MAC-Adresse bleibt gleich | Beide bleiben gleich (*das Schul-WLAN vergibt eine neue IP*) · Beide ändern sich (*die MAC steckt fest in der Hardware*) · Die MAC ändert sich, die IP bleibt (*genau andersherum*) |
| t3-11 | Ausschnitt aus ipconfig:<br>`IPv4-Adresse . . . : 192.168.0.57`<br>`Subnetzmaske . . . : 255.255.255.0`<br>`Standardgateway . . : 192.168.0.1`<br>Welche IP-Adresse hat **dieser Rechner**? | 192.168.0.57 | 192.168.0.1 (*das ist das Standardgateway, also der Router*) · 255.255.255.0 (*die Subnetzmaske ist keine Adresse*) · 192.168.0.0 (*steht hier gar nicht*) |
| t3-12 | Dein PC schickt ein Paket an google.com. An welches Gerät geht es zuerst? | An das Standardgateway, also den Router | Direkt an google.com (*erst muss es aus dem Heimnetz raus, über den Router*) · An den Switch des Nachbarn (*der hat mit deinem Netz nichts zu tun*) · An die MAC-Adresse von Google (*MAC-Adressen gelten nur im eigenen Netz*) |

## Fertig ist es, wenn

- `npm test` und `npm run build` grün sind.
- Die vorhandenen Test-Tests auch für Test M3 laufen (jede Option hat ein `warum`, genau eine Option ist richtig).
- Test M3 auf der Startseite als erstes Modul erscheint und unter `#/t3` direkt erreichbar ist.
- Committet ist, aber **nicht gepusht**.
