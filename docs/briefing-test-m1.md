# Briefing: Modul „Test M1“ – Wissenstest mit Auswertung

## Ziel

Ein kurzer Test (12 Fragen, ca. 10 Minuten) zum Stoff von **M1 – Geräte & Komponenten**, den die Klasse zu Beginn der nächsten Stunde in der App macht. Der Lehrer soll danach im Dashboard sehen:

- wie viele Fragen jedes Kind richtig hatte, und
- welche Fragen die ganze Klasse falsch hatte (um gezielt zu wiederholen).

Lies vorher `ARCHITECTURE.md` (§1, §5, §10) und `src/lessons/m1-geraete.ts`. Der Test ist ein eigenes Modul neben M1–M10, kein Umbau von M1.

## Abgrenzung zu den normalen Modulen

Die Module sind Übungen: Hilfe-Leiter (Stups → Hinweis → Lösung), beliebig viele Versuche, sofortige Rückmeldung. Ein Test ist das Gegenteil:

| | Übungsmodul | Test M1 |
|---|---|---|
| Versuche pro Frage | beliebig | **genau einer**, danach gesperrt |
| Hinweise | drei Stufen | **keine** |
| Rückmeldung | sofort | **erst nach der letzten Frage**, dann pro Frage richtig/falsch plus die „Warum“-Erklärung jeder gewählten Option |
| Wiederholen | jederzeit | nein – einmal abgegeben, bleibt das Ergebnis stehen |

Die Regel aus ARCHITECTURE.md §5.1 gilt trotzdem: Auf der Ergebnisseite bekommt jede falsche Antwort eine deutsche Erklärung, kein nacktes „falsch“. Dafür das bestehende `Frage`/`Option`-Format mit `warum` aus `src/model/frage.ts` verwenden.

## Datenmodell und Fortschritt

**Keine Datenbank-Migration nötig.** Jede Testfrage ist eine eigene Aufgabe mit global eindeutiger `task_id` (`t1-01` … `t1-12`) und landet über den bestehenden Weg (`pushChangedTaskProgress` in `src/progress/sync.ts`) in `task_progress`:

- `solved` = Antwort war richtig
- `attempts` = 1, sobald beantwortet
- `hints_used` = 0
- `lesson_id` = Modul-Badge, z. B. `T1`

Damit funktioniert die bestehende `summaryFor()`-Spalte im Dashboard sofort als Punktzahl („9/12“).

Lokal zusätzlich die gewählte Option pro Frage speichern, damit die Ergebnisseite nach einem Neuladen gleich aussieht: neues Feld in `Progress` (z. B. `tests: Record<taskId, { chosen: number }>`), analog zu `matches`/`walks`, inklusive `emptyProgress()` und der Leer-Prüfung `isBlank()`. Es reist dann automatisch über `pushProgressSnapshot` mit.

Die Antwortoptionen pro Kind mischen, mit dem vorhandenen `shuffle()` aus `src/model/rng.ts` und dem Schüler-Seed, damit Nachbarn nicht abschreiben können.

## Ablauf für das Kind

1. Startseite: „Test M1 – 12 Fragen, jede Frage nur ein Versuch, keine Hinweise.“ Knopf „Test starten“.
2. Eine Frage pro Bildschirm, Fortschritt „Frage 3 von 12“. Antwort anklicken → „Weiter“. Kein Zurück.
3. Nach Frage 12: Ergebnisseite „9 von 12 richtig“, darunter alle Fragen mit der eigenen Antwort, der richtigen Antwort und dem `warum`-Text.
4. Wer den Test schon abgegeben hat und das Modul wieder öffnet, landet direkt auf der Ergebnisseite.

Auf der Startseite der App erscheint der Test als eigene Kachel vor M1, mit Badge „Test“.

## Dashboard

Zusätzlich zur Punktzahl pro Kind eine kleine Auswertung **pro Frage**: Wie viele Kinder hatten Frage 1, 2, … richtig? Eine Zeile pro Frage mit Kurztext und Anteil, sortiert nach „am häufigsten falsch“. Die Daten liegen schon in `task_progress` (alle Zeilen mit `lesson_id = 'T1'`).

## Die Fragen

Wortlaut der Gerätesätze genau wie in `FUNKTIONEN` in `m1-geraete.ts`, denn das ist der Quali-Wortlaut. Jede Option braucht ein `warum`; für die richtigen und typischen falschen Optionen die Texte aus `m1-geraete.ts` übernehmen bzw. im gleichen Ton ergänzen.

**Teil A – Geräte erkennen (Bild + vier Namen)**
Für die Bilder dieselben Gerätebilder verwenden, die M1 Aufgabe 1 zeigt (`DeviceBild` / `src/editor/fotos.ts`).

| ID | Frage | Richtig | Falsche Optionen |
|---|---|---|---|
| t1-01 | Welches Gerät ist das? (Bild Router) | Router | Modem, Switch, Access Point |
| t1-02 | Welches Gerät ist das? (Bild Modem) | Modem | Router, NAS, Switch |
| t1-03 | Welches Gerät ist das? (Bild Switch) | Switch | Router, Server, Drucker |

**Teil B – Quali-Sätze (Satz → Gerät)**

| ID | Satz | Richtig | Falsche Optionen |
|---|---|---|---|
| t1-04 | Verbindet kabellose Geräte (WLAN) mit einem kabelgebundenen Netzwerk (LAN). | Access Point | Switch, WLAN-Repeater, Router |
| t1-05 | Spezieller Access Point, der selbst per WLAN und nicht per Kabel mit dem Router verbunden ist. | WLAN-Repeater | Access Point, Switch, Modem |
| t1-06 | Authentifiziert sich beim Provider und stellt die Internetverbindung her. | Modem | Router, Firewall, Server |
| t1-07 | Schützt einen Computer oder ein Netzwerk vor unerwünschten Zugriffen von innen oder außen. | Firewall | Router, Switch, NAS |
| t1-08 | Leitet Daten zwischen verschiedenen Netzwerken weiter, meist zwischen Heimnetz und Internet. | Router | Switch, Modem, Access Point |

**Teil C – Client und Server**

| ID | Frage | Richtig | Falsche Optionen |
|---|---|---|---|
| t1-09 | Ein Netzwerkdrucker wartet darauf, dass jemand drucken will. Was ist er im Netzwerk? | Server – er bietet den Dienst „Drucken“ an | Client – er nutzt das Netzwerk; Weder noch – Drucker zählen nicht |

**Teil D – Netzwerktypen**

| ID | Frage | Richtig | Falsche Optionen |
|---|---|---|---|
| t1-10 | Alle Schulen einer Stadt sind miteinander vernetzt. Welcher Netzwerktyp ist das? | MAN | LAN, WAN, GAN |
| t1-11 | Was ist der Unterschied zwischen LAN und WLAN? | Ein WLAN ist ein LAN ohne Kabel | Ein WLAN ist größer als ein LAN; WLAN ist ein anderes Wort für Internet |

**Teil E – Anschlüsse rechnen**

| ID | Frage | Richtig | Falsche Optionen |
|---|---|---|---|
| t1-12 | 5 PCs und 2 Drucker sollen per Kabel an einen Switch, der Switch selbst ans Netz. Wie viele Anschlüsse braucht der Switch mindestens? | 8 | 7 (Uplink vergessen), 6, 9 |

## Fertig ist es, wenn

- `npm test` und `npm run build` grün sind.
- Es Vitest-Tests gibt für: genau ein Versuch pro Frage (zweiter Klick ändert nichts), die Punktzahl, die gemischte Reihenfolge pro Seed, und dass jede Option ein `warum` hat.
- Der Test ohne Supabase (kein `VITE_SUPABASE_*`) genauso läuft, nur ohne Dashboard (ARCHITECTURE.md §1).
- Ein Durchlauf im Browser geklappt hat: Test machen, neu laden → Ergebnisseite; im Dashboard Punktzahl und Fragen-Auswertung sichtbar.
- Committet ist, aber **nicht gepusht** – das macht Hannes selbst.

## Nicht Teil dieser Aufgabe

- Lehrer-Freischaltung oder Zeitlimit für den Test.
- Tests für andere Module (der Aufbau soll aber so sein, dass ein „Test M2“ später nur neuen Inhalt braucht).
