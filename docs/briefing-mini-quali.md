# Briefing: „Mini-Quali“ – Test M1–M6 plus Tabellen-Praxis

## Ziel

Nach den Ferien soll die Klasse eine längere Standortbestimmung machen, mit Theorie und Praxis. Gebaut werden zwei neue Module, die direkt nacheinander auf der Startseite stehen:

| Modul | Art | Inhalt | Zeit |
|---|---|---|---|
| **Mini-Quali Teil A** | `TestLesson` (wie Test M1–M5) | 16 Fragen zu M1–M6 plus 4 Knobelfragen aus dem Schulbuch | ca. 15 Min |
| **Mini-Quali Teil B** | `SheetLesson` (wie M10) | neues Szenario `klassenfahrt` mit 4 Aufgaben zu SUMME, $-Bezug, WENN und bedingter Formatierung | ca. 15 Min |

Teil C (Scratch-Fehlersuche) läuft auf Papier und in Scratch, nicht in der App.

Das ist fast nur Inhalt: zwei Lesson-Dateien, ein Szenario, Einträge in den Listen.

## Teil A: Test `t5`

### Umsetzung

1. Neue Datei `src/lessons/t5-mini-quali.ts`. Aufbau wie `t3-test-m3.ts`, mit denselben Helfern `ok()`, `no()` und `frage()`. Die richtige Option steht jeweils zuerst.
2. Kennwerte:
   - `id: 't5'`
   - `module: 'T5'`
   - `title: 'Mini-Quali Teil A'`
   - Aufgaben-IDs `t5-01` … `t5-16`
3. Texte:
   - `quali`: „Alles aus M1 bis M6 auf einmal – so gemischt kommt es auch in der Quali.“
   - `intro.heading`: „Mini-Quali: Wo stehst du?“
   - `intro.body` im Ton von Test M3. Dazu der Satz: „Vier Fragen sind Knobelfragen zu Dingen, die wir gleich danach genauer anschauen – nachdenken lohnt sich.“
4. Für t5-11 und t5-12 dasselbe `ausschnitt` nehmen wie bei t3-11:

   ```
   IPv4-Adresse . . . : 192.168.178.34
   Subnetzmaske . . . : 255.255.255.0
   Standardgateway . . : 192.168.178.1
   ```

5. Falls **t4 (Test M5)** noch nicht umgesetzt ist, diesen Test trotzdem `t5` nennen. t4 kommt später.

### Fragen

Jede Option braucht ein `warum` im Ton der bisherigen Tests: kurz und freundlich. Bei falschen Antworten steht dazu, was stattdessen stimmt.

| ID | Frage | Richtig | Falsche Optionen (Kern des `warum`) |
|---|---|---|---|
| t5-01 | Welches Gerät verbindet dein Heimnetz mit dem Internet? | Der Router | Der Switch (*verbindet Geräte im selben Netz*) · Der WLAN-Repeater (*verlängert nur den Funk*) · Der Drucker (*ist nur ein Gerät im Netz*) |
| t5-02 | Was ist ein Server? | Ein Computer, der anderen Geräten etwas anbietet, z. B. Webseiten oder Dateien | Ein besonders schneller Gaming-PC (*es geht ums Anbieten, nicht ums Tempo*) · Das Kabel vom Router zur Wand (*das ist die Leitung*) · Das Programm, mit dem man surft (*das ist der Browser, ein Client*) |
| t5-03 | Was macht ein Switch? | Er verbindet Geräte im selben Netz per Kabel und schickt jedes Paket nur an das richtige Gerät | Er verbindet das Netz mit dem Internet (*das ist der Router*) · Er verstärkt das WLAN (*das ist der Repeater*) · Er übersetzt Namen in IP-Adressen (*das ist DNS*) |
| t5-04 | Was ist der Unterschied zwischen LAN und WLAN? | LAN geht über Kabel, WLAN über Funk | LAN ist das Internet, WLAN das Heimnetz (*beides sind Heimnetze*) · WLAN ist immer schneller (*Kabel ist meist schneller und stabiler*) · LAN gibt es nur in Firmen (*auch zu Hause: jedes Netzwerkkabel*) |
| t5-05 | Welche IPv4-Adresse ist gültig? | 192.168.1.20 | 192.168.1.300 (*kein Block über 255*) · 192.168.1 (*es fehlt ein Block, es müssen vier sein*) · 00:1A:2B:3C:4D:5E (*das ist eine MAC-Adresse*) |
| t5-06 | Was stimmt über die MAC-Adresse? | Sie ist fest in die Netzwerkkarte eingebaut und ändert sich nicht | Der Router vergibt sie jeden Tag neu (*das ist die IP-Adresse*) · Sie besteht aus vier Zahlen bis 255 (*das ist IPv4; MAC hat sechs Paare*) · Sie verrät, wo auf der Welt das Gerät steht (*sie verrät nur den Hersteller*) |
| t5-07 | *Knobelfrage.* Maske 255.255.255.0, Adresse 192.168.178.20: Welcher Teil steht für das **Gerät** (Hostanteil)? | 20 | 192.168.178 (*das ist der Netzanteil, bei allen im Netz gleich*) · 192 (*der erste Block gehört zum Netz*) · 255 (*das steht in der Maske, nicht in der Adresse*) |
| t5-08 | *Knobelfrage.* Maske 255.255.255.0: Welche zwei Geräte sind im **selben** Netz? | 192.168.178.20 und 192.168.178.45 | 192.168.178.20 und 192.168.179.20 (*der dritte Block ist anders, also ein anderes Netz*) · 10.0.0.5 und 192.168.0.5 (*die ersten drei Blöcke sind verschieden*) · 192.168.1.1 und 192.168.10.1 (*1 und 10 im dritten Block, also ein anderes Netz*) |
| t5-09 | *Knobelfrage.* Welche Adresse gibt es nur im Heimnetz (private Adresse)? | 192.168.0.15 | 8.8.8.8 (*öffentlicher DNS-Server von Google*) · 185.15.59.224 (*Wikipedia, im Internet erreichbar*) · 142.250.185.78 (*ein Google-Server*). Im `warum` der richtigen Option alle drei privaten Bereiche nennen: 10.…, 172.16.… bis 172.31.…, 192.168.… |
| t5-10 | *Knobelfrage.* Wer gibt im Heimnetz den Geräten automatisch ihre IP-Adresse? | Der Router (DHCP) | Der DNS-Server (*übersetzt nur Namen*) · Der Switch (*leitet nur weiter*) · Jedes Gerät denkt sich selbst eine aus (*dann gäbe es doppelte Adressen*). Im `warum` der richtigen Option ergänzen: „Drucker und Server bekommen oft eine feste (statische) Adresse, damit man sie immer wiederfindet.“ |
| t5-11 | *(mit Ausschnitt)* Welche Adresse hat hier der Router? | 192.168.178.1 | 192.168.178.34 (*das ist der eigene PC*) · 255.255.255.0 (*das ist die Maske, keine Adresse*) · Das steht hier nicht (*doch, beim Standardgateway*) |
| t5-12 | *(mit Ausschnitt)* Mit welchem Befehl prüfst du, ob der Router antwortet? | ping 192.168.178.1 | ping 255.255.255.0 (*die Maske ist kein Gerät*) · ipconfig 192.168.178.1 (*ipconfig zeigt nur den eigenen PC*) · tracert 192.168.178.34 (*das ist der eigene PC*) |
| t5-13 | Was macht der DNS-Server? | Er übersetzt Namen wie wikipedia.org in die IP-Adresse | Er speichert alle Webseiten (*das machen die Webserver*) · Er verschlüsselt die Verbindung (*das macht https*) · Er gibt den Geräten im Heimnetz ihre Adresse (*das macht der Router per DHCP*) |
| t5-14 | Was bedeutet das „s“ in https? | Die Verbindung ist verschlüsselt, Mitlesende sehen nur Zeichensalat | Die Seite ist frei von Viren (*https schützt nur den Weg, nicht den Inhalt*) · Die Seite lädt schneller (*s heißt secure, nicht speed*) · Der Staat hat die Seite geprüft (*jede Seite kann https haben*) |
| t5-15 | Welche Reihenfolge stimmt, wenn du eine Webseite aufrufst? | Adresse eintippen → DNS fragen → Anfrage an den Webserver → Seite kommt zurück | Drei Varianten, in denen zwei Schritte vertauscht sind (*das `warum` nennt den vertauschten Schritt, z. B. „Ohne DNS weiß der Browser die IP noch nicht“*) |
| t5-16 | Warum wird eine große Datei in viele kleine Pakete zerlegt? | Kleine Pakete reisen einzeln; geht eins verloren, wird nur dieses neu geschickt | Damit die Datei kleiner wird (*das wäre Zippen; die Summe bleibt gleich groß*) · Damit niemand mitlesen kann (*dafür braucht es Verschlüsselung*) · Weil ein Kabel nur einen Buchstaben auf einmal schafft (*Pakete haben viele Zeichen*) |

## Teil B: Tabellen-Praxis `t6` mit Szenario `klassenfahrt`

### Szenario

- `id: 'klassenfahrt'`
- `titleDe: 'Klassenfahrt-Kasse'`
- `subtitleDe: 'Mini-Quali · Datenverarbeitung'`

Daten (Zeile 4 = Kopf, fett):

| | A | B | C | D |
|---|---|---|---|---|
| 1 | Klassenfahrt nach Berlin | | | |
| 2 | Preis pro Person | 120 | | |
| 4 | Name | Bezahlt | Rest | Status |
| 5 | Lena | 120 | | |
| 6 | Emir | 80 | | |
| 7 | Sophie | 120 | | |
| 8 | Jonas | 0 | | |
| 9 | Mia | 60 | | |
| 10 | Ben | 120 | | |
| 11 | Ayla | 100 | | |
| 12 | Paul | 120 | | |
| 13 | Summe | | | |

Kontrollwerte:

- Rest: 0 · 40 · 0 · 120 · 60 · 0 · 20 · 0
- Summe Bezahlt: 720 · Summe Rest: 240
- Viermal „offen“ (Emir, Jonas, Mia, Ayla)

### Aufgaben

| ID | Aufgabe | Lösung / Checks | Punkte |
|---|---|---|---|
| `kf-summe` | Berechne in B13 und C13 die Summen. | `=SUMME(B5:B12)`, nach rechts bis C13; isFormula, usesFunction('SUMME'), filledDown nach rechts, matchesSolution | 1 |
| `kf-rest` | Berechne in C5, wie viel noch fehlt: Preis pro Person minus Bezahlt. Ziehe die Formel bis C12. | `=$B$2-B5`; hasAbsoluteRef('B2'), filledDown('C5:C12', …), matchesSolution | 2 |
| `kf-status` | Schreibe in D5 „offen“, wenn noch etwas fehlt, sonst „bezahlt“. Ziehe bis D12. | `=WENN(C5>0;"offen";"bezahlt")`; usesFunction('WENN'), filledDown('D5:D12', …), matchesSolution | 2 |
| `kf-farbe` | Bedingte Formatierung für D5:D12: Steht dort „offen“, soll die Zelle hellrot gefüllt sein. | hasConditionalFormat('D5:D12', { kind: 'equalText', text: 'offen' }, { fill: PALETTE.rot }) | 1 |

Fehlermeldung für `kf-rest`, wenn B2 relativ bleibt und die Formel heruntergezogen wird: „Beim Runterziehen rutscht B2 mit nach unten. Mit $B$2 bleibt der Preis fest.“ Gleiche Mechanik wie bei den bestehenden Aufgaben mit absolutem Bezug.

### Lesson `t6`

- `kind: 'sheet'`, `id: 't6'`, `module: 'T6'`, `title: 'Mini-Quali Teil B'`
- Eine Aufgabe `t6.1` mit `scenarioId: 'klassenfahrt'`.
- Hinweisleiter:
  - `stups`: „Die Summe zuerst – die kennst du. Beim Rest bleibt der Preis immer in derselben Zelle.“
  - `hinweis`: „Dollarzeichen machen einen Bezug fest: $B$2 rutscht beim Ziehen nicht mit. WENN hat drei Teile: Bedingung; dann; sonst. Text kommt in Anführungszeichen.“
  - `loesung`: „B13 =SUMME(B5:B12), nach rechts bis C13. C5 =$B$2-B5, bis C12 herunterziehen. D5 =WENN(C5>0;"offen";"bezahlt"), bis D12 herunterziehen. Bedingte Formatierung für D5:D12: Text ist gleich „offen“ → Füllung hellrot.“

## Einbinden

1. `SCENARIOS` um `klassenfahrt` ergänzen.
2. In `src/lessons/index.ts` **t5 und t6 ganz an den Anfang** setzen, in dieser Reihenfolge, mit Kommentar „Mini-Quali nach den Herbstferien“.
3. `docs/tabellenkalkulation.md`, Abschnitt Status: `klassenfahrt` als Übung für S/F-Grundlagen und $-Bezug eintragen.

## Fertig ist es, wenn

- `npm test` und `npm run build` grün sind.
- Die vorhandenen Test-Tests für t5 laufen: jede Option mit `warum`, genau eine richtig.
- Ein neuer Test spielt `klassenfahrt` mit allen Lösungen komplett durch und kommt auf 6/6 Punkte.
- Ein weiterer Test prüft: `=B2-B5` heruntergezogen ergibt die $-Meldung.
- `#/t5` und `#/t6` direkt erreichbar sind und beide als erste Module auf der Startseite stehen.
- Committet ist, aber **nicht gepusht**.
