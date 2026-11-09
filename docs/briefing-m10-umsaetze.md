# Briefing: M10 – 5. Aufgabe „Umsätze und Bonus“ (+ Sortieren)

## Ziel

M10 hat vier Szenarien: felder-berechnen, smv-wahl, vermoegen, klima. Gegenüber Schulbuch *Informatik 9* (Beispielquali Datenverarbeitung „Flughafen“) und dem Skill-Katalog in `docs/tabellenkalkulation.md` fehlen noch folgende Skills:

| Skill | Was | Stand |
|---|---|---|
| N5 | `ANZAHL` | Engine kann es, keine Aufgabe |
| N7 | `WENN` verschachtelt | Engine kann es, keine Aufgabe |
| N8 | `ZÄHLENWENN` | Engine kann es, keine Aufgabe |
| F16 | bedingte Formatierung → Schriftfarbe, hier nach **Text** (`equalText`) | Engine kann es, keine Aufgabe |
| D1 + D7 + D9 | Säulendiagramm mit Titel und Datenbeschriftung | Engine kann es, keine Aufgabe |
| **S2** | **Sortieren** | **fehlt in Engine und Checks** |

Das passt zum Prüfungstyp 5 aus dem Katalog, **„Umsätze und Bonus“** (Quali 2022, 2023). Daraus wird ein neues Szenario `umsaetze`, das als Aufgabe `t10.5` in M10 hängt.

## Teil 1: Sortieren (S2) in Engine, Oberfläche und Checks

1. **Engine:** Einen Bereich nach einer Spalte sortieren, aufsteigend oder absteigend, Zahlen numerisch und Text alphabetisch. Ganze Zeilen wandern mit, auch Formatierung.
   - Formeln verhalten sich wie in Excel: Bezüge auf **dieselbe Zeile** wandern mit der Zeile mit, absolute Bezüge (`$F$12`) bleiben stehen.
   - Unit-Tests für Zahlen, Text, auf- und absteigend, Formeln mit relativen und absoluten Bezügen.
2. **Oberfläche:** Im Menüband ein Knopf **„Sortieren“**. Bereich markieren → Dialog „Sortieren nach Spalte ‹X›, aufsteigend/absteigend“ → OK. Kopfzeile ist ausgenommen, wenn die erste markierte Zeile Text enthält.
3. **Check:** `rowOrder(range, column, 'asc' | 'desc')`. Prüft, dass die Werte in `column` innerhalb von `range` sortiert sind **und** dass jede Zeile noch zusammengehört: Der Name gehört weiter zum selben Umsatz. Fehlermeldung bei zerrissenen Zeilen: „Du hast nur eine Spalte sortiert – markiere die ganze Tabelle.“

## Teil 2: Szenario `umsaetze`

`titleDe: 'Umsätze und Bonus'`, `subtitleDe: 'Quali-Typ 2022/2023 · Datenverarbeitung'`. Daten (Zeile 3 = Kopf, fett):

| | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|
| 1 | *(Titel, Aufgabe 1)* | | | | | | |
| 3 | Name | Filiale | Januar | Februar | März | Gesamt | Bonus |
| 4 | Huber | Grafing | 9800 | 11200 | 10500 | | |
| 5 | Yilmaz | Moosach | 7200 | 6900 | 8100 | | |
| 6 | Schneider | Ebersberg | 5400 | 6100 | 5800 | | |
| 7 | Kovač | Grafing | 8800 | 9400 | 7900 | | |
| 8 | Bauer | Moosach | 10200 | 9900 | 11300 | | |
| 9 | Neumann | Ebersberg | 6600 | 7100 | 6200 | | |
| 10 | Wagner | Grafing | 4900 | 5200 | 6100 | | |
| 11 | Petrović | Moosach | 7700 | 8300 | 9100 | | |
| 12 | Summe | | | | | | |
| 14 | Anzahl Mitarbeiter | | | | | | |
| 15 | Mitarbeiter in Grafing | | | | | | |

Gesamtwerte zur Kontrolle: 31500 · 22200 · 17300 · 26100 · 31400 · 19900 · 16200 · 25100. Damit kommt jeder Zweig des Bonus vor: 300, 100 und 0.

Aufgaben (deutsch, im Stil der bestehenden Szenarien, Checks aus `@quali/core`):

| ID | Aufgabe | Lösung / Checks | Punkte |
|---|---|---|---|
| `ums-titel` | Verbinde und zentriere A1–G1, Überschrift „Umsätze 1. Quartal“. | valueEquals, isMerged('A1:G1'), hasStyle center | 1 |
| `ums-gesamt` | Berechne in F4 den Gesamtumsatz und ziehe bis F11. | `=SUMME(C4:E4)`, filledDown('F4:F11') | 1 |
| `ums-summe` | Berechne in C12 bis F12 die Summen der Spalten. | `=SUMME(C4:C11)`, filledDown nach rechts bis F12 | 1 |
| `ums-bonus` | Bonus in G4, bis G11 ziehen: über 30 000 € gibt es 300 €, über 20 000 € gibt es 100 €, sonst 0 €. | `=WENN(F4>30000;300;WENN(F4>20000;100;0))`, usesFunction('WENN') **zweimal** (verschachtelt), filledDown('G4:G11') | 2 |
| `ums-anzahl` | Berechne in B14, wie viele Mitarbeiter Umsätze haben. | `=ANZAHL(F4:F11)`, usesFunction('ANZAHL') | 1 |
| `ums-grafing` | Berechne in B15, wie viele Mitarbeiter in Grafing arbeiten. | `=ZÄHLENWENN(B4:B11;"Grafing")`, usesFunction('ZÄHLENWENN') | 1 |
| `ums-euro` | Formatiere C4:G12 als Währung Euro ohne Nachkommastellen. | numberFormatIs (wie F12) | 1 |
| `ums-filiale` | Bedingte Formatierung für B4:B11: Steht dort „Grafing“, soll die Schrift blau sein. | hasConditionalFormat('B4:B11', { kind: 'equalText', text: 'Grafing' }, { color: PALETTE.blau }) | 1 |
| `ums-sortieren` | Sortiere die Tabelle A3:G11 nach dem Gesamtumsatz absteigend. | rowOrder('A4:G11', 'F', 'desc') | 1 |
| `ums-diagramm` | Erstelle ein Säulendiagramm mit dem Gesamtumsatz pro Mitarbeiter, Titel „Umsatz 1. Quartal“, Datenbeschriftung mit Werten. | hasChart({ kind: 'column', source: …, title, dataLabels: 'value' }) | 2 |

Hinweise dazu:
- **Prüfung der Verschachtelung:** Falls `usesFunction` nicht zählen kann, einen Check `usesFunctionTimes('WENN', 2)` ergänzen. Ein einfaches WENN mit nur zwei Zweigen bekommt die Meldung: „Es gibt drei Fälle – du brauchst ein zweites WENN im Sonst-Teil.“
- **Diagrammquelle:** Die Quelle sind Namen und Gesamt, also **zwei nicht zusammenhängende Bereiche** (`A3:A11` und `F3:F11`, in Excel mit Strg markiert). Kann `ChartSpec.source` das noch nicht, dafür Mehrfachbereiche in Modell, Oberfläche (Strg/⌘-Klick-Markierung) und `hasChart` ergänzen. Das ist ein echter Prüfungsgriff.
- **Reihenfolge:** Sortieren kommt bewusst nach den Formeln. Die Lösungen und Checks für F, G, B14 und B15 müssen nach dem Sortieren weiter stimmen.

## Teil 3: Einbinden

1. `SCENARIOS` um `umsaetze` ergänzen.
2. In `src/lessons/m10-tabellen.ts` Aufgabe `t10.5` mit `scenarioId: 'umsaetze'` und Hinweisleiter (stups / hinweis / loesung) im Ton von t10.1–t10.4. Die Lösung nennt die Formeln aus der Tabelle oben.
3. Im `quali`-Text von M10 ergänzen: ANZAHL, ZÄHLENWENN, Sortieren.
4. `docs/tabellenkalkulation.md`: Abschnitt 6 „Status“ aktualisieren, also welche Skills jetzt eine Aufgabe haben.

## Fertig ist es, wenn

- `npm test` und `npm run build` grün sind. Neue Tests decken ab:
  - Sortieren in der Engine
  - `rowOrder`, auch mit zerrissenen Zeilen
  - verschachteltes WENN, auch die Meldung bei nur einem WENN
  - Diagramm mit Mehrfachbereich
  - komplettes Durchspielen von `umsaetze` mit allen Lösungen → volle Punktzahl
- Die bestehenden vier Szenarien unverändert bestehen.
- Committet ist, aber **nicht gepusht**.
