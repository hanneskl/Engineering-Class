# Briefing: M3 erweitern – Netzanteil, private Bereiche, feste Adressen

## Ziel

Das Schulbuch *Informatik 9* (C.C. Buchner, Mittelschule Bayern) und sein Beispiel-Quali fragen Dinge ab, die M3 – *Adressen im Netzwerk* (`src/lessons/m3-adressen.ts`) noch nicht hat:

- die Begriffe **Netzanteil** und **Hostanteil** („Benenne die beiden Bereiche“ steht wörtlich im Beispiel-Quali Teil A),
- alle **drei privaten Adressbereiche**, nicht nur 192.168,
- **statische und dynamische** IP-Adressen (Netzwerkdrucker = statisch),
- den **Adressbereich des DHCP-Servers** (Unter- und Obergrenze, wie viele Adressen),
- **169.254.…** = Gerät hat keine Adresse vom DHCP-Server bekommen.

Diese Aufgabe ist **reiner Inhalt** im bestehenden Modul. Keine neue Infrastruktur.

## Umsetzung

### 1. Bestehende Aufgaben

- Die IDs aller bestehenden Aufgaben bleiben **unverändert**, damit der Fortschritt der Kinder erhalten bleibt.
- In `privat` nur den `hinweis` und die `answer` anpassen: Private Adressen gibt es in drei Bereichen, **10.x.x.x**, **172.16.x.x bis 172.31.x.x** und **192.168.x.x**. Heimnetze nutzen fast immer 192.168. Die richtige Option und die falschen Optionen bleiben.

### 2. Neue Auswahlaufgaben (`ChoiceSpec`, im Ton der bestehenden)

| ID | Frage | Richtig | Falsch |
|---|---|---|---|
| `anteile` | Eine IP-Adresse besteht aus zwei Teilen. Wie heißen sie? | Netzanteil und Hostanteil | Vorwahl und Rufnummer · Router-Teil und Geräte-Teil · Innen-Teil und Außen-Teil |
| `bereiche` | Welche dieser Adressen ist **auch** eine private Adresse? | 10.0.0.15 | 84.153.12.7 · 8.8.8.8 · 172.32.5.1 |
| `statisch` | Warum bekommt ein Netzwerkdrucker meist eine feste (statische) IP-Adresse? | Damit ihn alle Geräte immer unter derselben Adresse finden | Damit er schneller druckt · Weil Drucker kein DHCP verstehen · Damit er aus dem Internet erreichbar ist |
| `apipa` | `ipconfig` zeigt bei einem Laptop die Adresse 169.254.31.7. Was ist passiert? | Er hat keine Adresse vom DHCP-Server (Router) bekommen | Er ist mit dem Internet verbunden · Er hat eine statische Adresse · Er ist im Netz der Schule |

Für jede Option `stups`, `hinweis` und `answer` schreiben.
- `anteile`: Der Netzanteil ist wie die Straße, der Hostanteil wie die Hausnummer. Bei 192.168.178.20 ist 192.168.178 der Netzanteil und 20 der Hostanteil.
- `bereiche`: 172.32 liegt knapp außerhalb von 172.16–172.31. Das muss die `answer` erklären.

### 3. Neue Textaufgaben (pro Kind aus dem Seed, wie `ipconfigFor`)

1. **`m3-hostanteil`:** „Wie lautet der Hostanteil von ‹Adresse›?“
   - Die Adresse kommt aus dem Seed, abwechselnd aus den drei privaten Bereichen, mit Subnetzmaske 255.255.255.0. Beispiele: `10.104.15.7`, `172.18.225.72`, `192.168.0.5`.
   - Antwort ist die letzte Zahl.
   - Gibt das Kind die ganze Adresse oder die ersten drei Zahlen ein, kommt eine eigene Rückmeldung: „Das ist der Netzanteil“ bzw. „Das ist die ganze Adresse“, analog zu `checkAddress`.
2. **`m3-range`:** „Der DHCP-Server vergibt Adressen von 192.168.‹n›.‹a› bis 192.168.‹n›.‹b›. Wie viele Geräte können eine Adresse bekommen?“
   - `a` und `b` kommen aus dem Seed, `b − a` liegt zwischen 9 und 60.
   - Antwort: `b − a + 1`.
   - Bei der Eingabe `b − a` kommt eine eigene Rückmeldung: „Fast – zähl die erste und die letzte Adresse mit.“
   - Akzeptiert werden nur Ziffern. Leerzeichen und ein angehängtes „Geräte“ oder „Adressen“ sind erlaubt.

### 4. Reihenfolge in `buildTasks`

was → **anteile** → gueltig → **m3-hostanteil** → wer → **m3-range** → **statisch** → **apipa** → ipconfig-Aufgaben → privat → **bereiche** → extern → gateway → mac

### 5. Texte

- **Intro:** nach dem ersten Absatz einen kurzen Absatz einfügen: Netzanteil = Straße, Hostanteil = Hausnummer. Private Adressen gibt es in drei Bereichen (10…, 172.16–31…, 192.168…).
- **Absatz zum Router:** einen Satz ergänzen. Der Router vergibt Adressen aus einem festgelegten Bereich. Geräte wie Drucker bekommen eine feste Adresse.
- **`quali`:** ergänzen, dass das Beispiel-Quali im Schulbuch auch „Wie ist eine IP-Adresse aufgebaut? Benenne die beiden Bereiche.“ fragt.

## Fertig ist es, wenn

- `npm test` und `npm run build` grün sind.
- `src/model/m3.test.ts` deckt die neuen Aufgaben ab:
  - Hostanteil richtig, Netzanteil als eigener Fehler, ganze Adresse als eigener Fehler.
  - Range richtig, „off by one“ als eigener Fehler.
  - Für mehrere Seeds liegen die Adressen in privaten Bereichen und es gilt `b > a`.
- Alle bestehenden Aufgaben-IDs von M3 unverändert sind.
- Committet ist, aber **nicht gepusht**.
