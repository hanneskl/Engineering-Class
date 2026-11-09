# Briefing: Modul „Test M5“

## Ziel

Ein vierter Test im selben Format wie **Test M1–M3** (`src/lessons/t1-test-m1.ts` … `t3-test-m3.ts`), diesmal zum Stoff von **M5 – Netzwerkbefehle**. Die Klasse macht ihn zu Beginn der M6-Stunde.

Das ist **reiner Inhalt**: eine neue Datei plus ein Eintrag in der Modulliste.

## Umsetzung

1. Neue Datei `src/lessons/t4-test-m5.ts`, aufgebaut wie `t3-test-m3.ts`: dieselben Helfer `ok()`, `no()` und `frage()`. Die richtige Option steht jeweils zuerst, der Bildschirm mischt pro Kind.
2. Kennwerte:
   - `id: 't4'`
   - `module: 'T4'`
   - `title: 'Test M5'`
   - Aufgaben-IDs `t4-01` … `t4-12`
3. `quali`- und `intro`-Texte im Ton von Test M3.
4. In `src/lessons/index.ts` den Test **ganz an den Anfang** der Liste setzen, vor Test M3, und den Kommentar dazu ergänzen.
5. Keine Bilder. Für die mehrzeiligen Ausgaben bei t4-07 und t4-08 dieselbe Darstellung nehmen wie für den ipconfig-Ausschnitt in Test M3.

## Die Fragen

Jede Option braucht ein `warum` im Ton der bisherigen Tests: kurz und freundlich. Bei falschen Antworten steht dazu, was stattdessen stimmt.

| ID | Frage | Richtig | Falsche Optionen (mit Kern des `warum`) |
|---|---|---|---|
| t4-01 | Wie öffnest du unter Windows die Eingabeaufforderung? | Windows-Taste, `cmd` eintippen, Enter | Rechtsklick auf den Desktop (*dort gibt es keine Eingabeaufforderung*) · Im Browser `cmd` eingeben (*der Browser ist kein Befehlsfenster*) · Strg + Alt + Entf (*öffnet den Sperrbildschirm*) |
| t4-02 | Welcher Befehl zeigt deine eigene IP-Adresse und das Standardgateway? | ipconfig | ping (*testet nur, ob jemand antwortet*) · tracert (*zeigt den Weg*) · arp -a (*zeigt die Nachbarn*) |
| t4-03 | Welcher Befehl listet die anderen Geräte im Netz mit ihrer MAC-Adresse? | arp -a | ipconfig (*zeigt nur das eigene Gerät*) · ping (*fragt ein einzelnes Ziel*) · tracert (*zeigt Stationen auf dem Weg ins Internet*) |
| t4-04 | Was macht der Befehl `ping 192.168.178.1`? | Er schickt ein kleines Testpaket an den Router und wartet auf eine Antwort | Er startet den Router neu (*ping fragt nur*) · Er zeigt alle Geräte im Netz (*das ist arp -a*) · Er misst die Internetgeschwindigkeit in Mbit/s (*er misst die Antwortzeit in ms*) |
| t4-05 | Was bedeutet die Angabe „Zeit=1ms“ bei ping? | Hin- und Rückweg haben eine Tausendstel Sekunde gedauert | Die Seite lädt in 1 Minute (*ms heißt Millisekunde*) · Es wurde 1 MB übertragen (*das ist keine Datenmenge*) · Das Gerät ist 1 Meter entfernt (*ping misst Zeit, keine Entfernung*) |
| t4-06 | Welches Gerät antwortet bei ping meistens am schnellsten? | Ein PC, der per Kabel am Router hängt | Ein Laptop im WLAN (*Funk ist langsamer als Kabel*) · Eine Konsole hinter dem WLAN-Repeater (*zweimal Funk, ein Umweg mehr*) · Ein Server im Internet (*viele Stationen dazwischen*) |
| t4-07 | ping zeigt: „Zeitüberschreitung der Anforderung.“ Was heißt das? | Das Ziel hat nicht geantwortet – es ist gerade nicht erreichbar | Alles ist in Ordnung (*keine Antwort ist ein Problem*) · Der eigene PC hat keine IP-Adresse mehr (*das zeigt ipconfig*) · Das Internet ist zu schnell (*gibt es nicht*) |
| t4-08 | Was zeigt der Befehl `tracert google.com`? | Jede Station, über die das Paket bis google.com läuft | Die IP-Adresse des eigenen PCs (*das ist ipconfig*) · Den Inhalt der Seite google.com (*das macht der Browser*) · Alle Geräte im Heimnetz (*das ist arp -a*) |
| t4-09 | Welche Station steht bei tracert immer ganz oben, also an Nummer 1? | Der eigene Router, das Standardgateway | google.com (*das Ziel steht ganz unten*) · Der DNS-Server (*der taucht bei tracert nicht auf*) · Der Switch (*Switches haben keine Station mit Zeit*) |
| t4-10 | „Das Internet geht nicht!“ Womit fängt der Profi an? | ipconfig: Habe ich überhaupt eine Adresse? | Sofort tracert google.com (*erst das eigene Gerät prüfen*) · Router wegwerfen (*erst prüfen, dann handeln*) · Den Browser neu installieren (*der Fehler liegt meist im Netz*) |
| t4-11 | `ping 192.168.178.1` klappt, `ping google.com` nicht. Wo liegt das Problem wahrscheinlich? | Zwischen Router und Internet – beim Router oder beim Anbieter | Am eigenen PC (*der Router antwortet ja*) · Am WLAN-Kabel (*bis zum Router geht es*) · An der Tastatur (*die Befehle kommen an*) |
| t4-12 | Was gehört zusammen? | ipconfig – Wer bin ich? · arp -a – Wer ist noch da? · ping – Bist du da? · tracert – Welcher Weg? | Drei Varianten, in denen jeweils zwei Befehle vertauscht sind (*das `warum` nennt den vertauschten Befehl*) |

## Fertig ist es, wenn

- `npm test` und `npm run build` grün sind.
- Die vorhandenen Test-Tests auch für Test M5 laufen: Jede Option hat ein `warum`, genau eine Option ist richtig.
- Test M5 auf der Startseite als erstes Modul erscheint und unter `#/t4` direkt erreichbar ist.
- Committet ist, aber **nicht gepusht**.
