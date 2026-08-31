# Network Education

A planned web-based **network planning & simulation tool** for Informatik 9 at
Mittelschule Glonn — built so students can plan a network visually, learn how the
internet works, and have the tool *verify that they did the work themselves*.

This document is the **curriculum analysis and task inventory**. It answers one
question: *what exactly do the kids have to be able to do for the Quali in
Informatik?* [ARCHITECTURE.md](ARCHITECTURE.md) covers how the tool is built.

## Running it

```bash
npm install
npm run dev      # local development
npm test         # checker logic
npm run build    # production build into dist/
```

Pushing to `main` deploys to GitHub Pages. **Built so far:** M4 (Binärzahlen)
and M8 (Begriffe & Abkürzungen) — the two modules that need no network engine.
Everything else in §4 is still to come.

---

## 1. Where this comes from

Analysed sources (Google Drive → `Teaching/`):

| Source | What it contributed |
| --- | --- |
| `2024-09-23 Informatik Netzwerke` (Slides) | The actual teaching sequence, all in-class exercises, the LehrplanPLUS competency text |
| `Informatik/2026-06-12 Quali 2026 Informatik` (PDF, incl. Lösung) | The current exam + official answers |
| `Informatik/Info_2024_25/Quali/Alle Qualis.pdf` | Quali exams 2019, 2020, 2022, 2023 — the networking question bank across years |
| `Info_2022_23/Unterlagen/Informatik 2022_23.docx` | Component definitions (Router, Modem, AP, Repeater, Switch, Kabel, Client/Server) |
| `Info_2021_22/Unterlagen/Info_202122.docx` | Network modelling with draw.io, layers, connectors, UML |
| `Info_2021_22/Unterlagen/draw.io/Netzwerkgeräte.xml` | The draw.io icon library currently used for network devices |
| `2024-10-08 Netzwerkdiagramm - Lösung.drawio` | Reference solution of the classroom network diagram |
| `Info_2021_22/Unterlagen/MY-DIGITAL-HOME-Heimnetzwerk.png` | Reference picture of a home network |
| `Grundlagen/Quali-Theorie_2022.docx` | Theory question bank (multiple choice + free text) |

Today the students do this with **draw.io** (drawing) + **Filius** (simulation) +
**Windows cmd** (`ipconfig`, `ping`, `arp`, `tracert`) + **speedtest.net** +
router web UIs. The tool is meant to replace that toolchain with one guided,
self-checking environment.

---

## 2. The binding curriculum (LehrplanPLUS, Informatik 9 — "Informationsaustausch")

Verbatim competency expectations. *Die Schülerinnen und Schüler …*

1. … **stellen angeleitet lokale Netzwerke unter Berücksichtigung gängiger
   Netzwerkkomponenten bildlich dar.**
2. … **bilden die Verbindung lokaler Netzwerke zum Internet mit einem
   Simulationsprogramm ab**, um zu erkennen, dass es nur eine vermeintliche
   Anonymität in einem Netzwerk gibt.
3. … **beschreiben angeleitet die Prozesse von der Eingabe einer URL bis zur
   Anzeige einer Web-Seite**, um das grundlegende Funktionsprinzip des Internets
   wiederzugeben.

**Inhalte zu den Kompetenzen:**
- Netzwerkkomponenten (z. B. Router, Accesspoint, Switch)
- IP-Adresse (**ohne Subnetz** — no subnetting, no CIDR, no subnet masks required)
- Kommunikation über Browser, Protokolle **HTTP** (HTTP-Request/HTTP-Response)
  und **HTTPS** (Sicherheit durch Verschlüsselung und Authentifizierung),
  **Namensauflösung (DNS)**

Everything below is a decomposition of these three sentences into checkable tasks.

---

## 3. What the Quali actually asks (2019–2026)

Evidence from the exam papers, so the tool trains what is really graded.

### Quali 2026 (current, 19.05.2026 — Theorie 30 P.)
| # | Question | Points | Expected answer |
| --- | --- | --- | --- |
| 4 | Benenne diese Netzwerkkomponenten und gib ihre Funktion an | **6** | Router / Access Point / Switch (3 P. naming) + one function sentence each (3 P.) |
| 5 | Warum arbeitet ein Computer mit dem Binärcodesystem? | 2 | Elektrische Signale, nur zwei Zustände: Strom an (1) / Strom aus (0) |
| 6 | Dezimal → Binär (29, 17, 63) | 3 | 11101 / 10001 / 111111 |
| 7 | Binär → Dezimal (111, 10101, 10000) | 3 | 7 / 21 / 16 |
| 8 | Was ist eine IP-Adresse? | 1 | Eindeutige Nummer eines Geräts im Netzwerk, damit es erkannt wird |
| 9 | Wer vergibt die IP-Adressen? | 1 | Der Router (**DHCP** = Dynamic Host Configuration Protocol) |

→ **16 of 30 theory points are networking + binary.** This is the single
biggest scoring block in the theory part.

### Recurring across all years
- **Beschrifte das Netzwerkschema** — label 3 marked components in a given
  network diagram (2022: 1,5 P.; 2023: 3 P.)
- **Zuordnung Netzwerkkomponenten → Beschreibung** (2022, 2023, 2 P. each) from a
  pool of: Router, Switch, Access Point, WLAN-Repeater, Firewall, Server, NAS,
  Modem, RJ-45, Drucker, Smartphone, Beamer
- **Welches Gerät vergibt IP-Adressen?** → Router (recurs 2019/20, 2023, 2026)
- **Wofür steht IP / LAN / www?** (Internet Protocol / Local Area Network / World Wide Web)
- **Warum müssen in einem Netzwerk IP-Adressen vergeben werden?**
- **`ipconfig`-Ausgabe lesen**: which command produced it, own IP, router IP
  (2022, 2023) — "2 Schritte" to open it on Windows (cmd → `ipconfig`)
- **Was ist ein Cookie?** → ein Wert, der im Browser des Benutzers gespeichert wird
- **Was ist VoIP?** → Telefonieren übers Internet
- **Binärzahlen in beide Richtungen** — in *every* exam

---

## 4. Task inventory

The complete list of what the students must be taught and be able to do. Each
task is written so the tool can guide it **and** verify it.
`✅ Check` = what the tool must be able to auto-verify.

### M1 — Geräte & Komponenten kennen (Component knowledge)

- **T1.1 — Netzwerkkomponenten benennen.** Recognise and name from an icon:
  Router, Switch, Access Point, WLAN-Repeater/Extender, Modem, Server, NAS,
  Firewall, Netzwerkkabel/RJ-45, Client (PC, Laptop, Smartphone, Konsole,
  Drucker, Smart-TV, IoT).
  ✅ Check: icon → name matching, 100 % correct.
- **T1.2 — Funktion jeder Komponente in einem Satz erklären.** Exactly the
  Quali 2026 wording:
  - Router — leitet Daten zwischen verschiedenen Netzwerken weiter, meist zwischen Heimnetz und Internet.
  - Access Point — verbindet kabellose Geräte (WLAN) mit einem kabelgebundenen Netzwerk (LAN).
  - Switch — verbindet mehrere Geräte in einem kabelgebundenen Netzwerk (LAN) miteinander.
  - Modem — authentifiziert sich beim Provider und stellt die Internetverbindung her.
  - Repeater — spezieller Access Point, selbst per WLAN (nicht per Kabel) mit dem Router verbunden.
  - Firewall — schützt Computer/Netzwerk vor unerwünschten Zugriffen von innen oder außen.
  - Server / NAS — stellt Dienste bzw. Speicher im Netzwerk bereit.
  ✅ Check: description → component matching (the Quali "Zuordnung" format).
- **T1.3 — Client-Server-Prinzip erklären.** Wer bietet einen Dienst an, wer nutzt ihn.
  ✅ Check: classify a set of devices as Client or Server.
- **T1.4 — Netzwerktypen unterscheiden:** GAN, WAN, MAN, LAN, WLAN — plus the
  abbreviation drill (**LAN = Local Area Network**).
  ✅ Check: multiple choice + scale ordering (which is bigger than which).
- **T1.5 — Kabel & Stecker.** Netzwerkkabel, Stecker-Typ **RJ-45**, 8 paarweise
  verdrillte Adern, Ports an einem Switch (4/8/16).
  ✅ Check: name the connector type; count required ports for a given device count.
- **T1.6 — Router-Weboberfläche kennen.** `http://fritz.box`, Speedport,
  Google Wifi: Zugangsdaten, Geräteliste, welche Geräte hängen im Netz.
  ✅ Check: guided walkthrough of a simulated router UI; find the device list
  and the router's own IP.

### M2 — Netzwerk zeichnen / planen (the core design tool)

- **T2.1 — Intranet des Computerraums darstellen.** Place all devices of the
  classroom, connect them correctly (currently the `02_Schüler_Netzwerkplan`
  exercise in draw.io).
  ✅ Check: topology validity — every end device reaches the router; no client
  wired directly into a port that doesn't exist; WLAN devices connect to an AP,
  not by cable.
- **T2.2 — Netzwerk um alle Geräte im Raum erweitern.** Add every real device.
  ✅ Check: minimum device count / required device classes present.
- **T2.3 — Google-Server ins Diagramm aufnehmen.** Draw the outside world:
  Internet-Wolke + externer Server.
  ✅ Check: an external server exists and is reachable only *through* the router.
- **T2.4 — Hausaufgabe: eigenes Heimnetzwerk zeichnen.** Router, Switches,
  WLAN-Router, Repeater, Konsolen, Computer, Handys — the assignment as given
  ("Aufgabe für den 22. Oktober").
  ✅ Check: plausibility rules (exactly one router to the internet; every device
  connected; repeater linked wirelessly, AP linked by cable) + student-specific
  data so two students cannot hand in the same file.
- **T2.5 — Glasfaser Haus / Wohnung.** Where the fibre enters the building, ONT
  vs. Router, house connection vs. flat.
  ✅ Check: place the components in the correct order from street → flat.
- **T2.6 — Ebenen, Verbinder, Ausrichtung.** The draw.io skills that transfer:
  connectors stay attached when a device is moved, snapping to a grid, layers.
  ✅ Check: implicit — the editor enforces it.

### M3 — Adressen (IP, MAC, DHCP)

- **T3.1 — "Netzwerke brauchen Adressen."** Warum müssen IP-Adressen vergeben
  werden? Damit jedes Gerät eindeutig erkannt und adressiert werden kann.
  ✅ Check: free-text/multiple-choice + a simulation where two devices get the
  same IP and the student has to find the conflict.
- **T3.2 — Was ist eine IP-Adresse?** Eindeutige Nummer eines Geräts im
  Netzwerk. **IP = Internet Protocol.** IPv4 dotted-quad form.
  Explicitly **ohne Subnetz** per Lehrplan.
  ✅ Check: valid/invalid IPv4 recognition (e.g. `192.168.178.300` invalid).
- **T3.3 — Wer vergibt IP-Adressen?** Der **Router** per **DHCP** (Dynamic Host
  Configuration Protocol).
  ✅ Check: the exam question, plus: turn DHCP off in the simulator and let the
  student observe that new devices get no address.
- **T3.4 — Interne vs. externe IP-Adresse.** Private Heimnetz-Adresse
  (192.168.x.x) vs. the public address the world sees
  (`whatismyipaddress.com` / `wieistmeineip.de`). Alle Geräte im Haus teilen
  sich **eine** externe Adresse.
  ✅ Check: student must enter both for their own diagram and explain why the
  external one is the same for every device.
- **T3.5 — IP-Adressen im Diagramm eintragen.** Every device in the plan gets
  its address, discovered via `ipconfig` and `arp -a`.
  ✅ Check: all addresses in the same private range, unique, router = gateway.
- **T3.6 — MAC-Adresse / `arp -a`.** Which device is physically which.
  ✅ Check: map a MAC list to devices.
- **T3.7 — Gateway-Begriff.** Which address a device sends to when the target is
  outside the local network.
  ✅ Check: identify the gateway from an `ipconfig` output (recurring Quali task).

### M4 — Binärzahlen (examined every single year)

- **T4.1 — Warum binär?** Computer werden durch elektrische Signale gesteuert;
  diese haben nur zwei Zustände: Strom an (1) / Strom aus (0).
  ✅ Check: exact-concept free-text / MC.
- **T4.2 — Dezimal → Binär** using the Stellenwert table (1, 2, 4, 8, 16, 32,
  64, 128) with the "Gesetzt / Rest" method taught in class.
  ✅ Check: generated exercises, answer verified; show the place-value table as
  a hint on failure.
- **T4.3 — Binär → Dezimal** (Summe der gesetzten Stellen).
  ✅ Check: generated exercises.
- **T4.4 — Anderes Zahlensystem nennen** (Hexadezimal) — asked in Quali 2023.
- **T4.5 — Bezug zur IP-Adresse.** Optional bridge: why each of the four octets
  ends at 255. *(Beyond the Lehrplan minimum, good for stronger students.)*

### M5 — Netzwerkbefehle & Diagnose

- **T5.1 — `ipconfig`.** Open the command line (2 Schritte: cmd öffnen →
  `ipconfig` eingeben), read own IP, gateway/router IP, subnet line.
  ✅ Check: reproduce the recurring Quali task "read this output and name the
  command, the own IP, the router IP".
- **T5.2 — `arp -a`.** List all devices seen in the local network.
- **T5.3 — `ping`.** Was passiert beim Ping? Round-trip time. Ping every device
  in the plan and record its latency in the diagram.
  ✅ Check: latencies recorded for all devices; the student must explain why the
  local ping is much faster than `ping google.com`.
- **T5.4 — `ping google.com`** und die Beobachtung: warum ist das viel langsamer?
- **T5.5 — `tracert` / traceroute.** Anzahl der Server/Router zwischen mir und
  meiner Lieblingswebsite; Gesamtdauer des Requests.
  ✅ Check: hop count + total time entered; the simulator can produce a
  reproducible route.
- **T5.6 — speedtest.net.** Measure the network speed in Mbit/s and enter it in
  the diagram.
- **T5.7 — Troubleshooting-Kette "Was tun, wenn das Internet langsam ist?"**
  1. WLAN prüfen — Ping Router < 10 ms
  2. Internet prüfen — Ping google.com < 30 ms
  3. Internet-Speed prüfen — speedtest.net
  4. Hardware neu starten — Kabel an Modem, Router, WLAN-Router ziehen, 10 s warten, wieder einstecken
  5. ISP anrufen (z. B. Telekom)
  ✅ Check: the tool injects a fault (WLAN weak / router down / ISP line down /
  DNS broken) and the student must run the steps in the right order and name
  the cause. **This is the single best "did you really understand it" exercise.**

### M6 — Wie funktioniert das Internet? (URL → Webseite)

The Lehrplan's third competency, step by step. This is the guided
animation/simulation the tool must deliver.

- **T6.1 — Client, Browser, Webserver.** Was ist eine Internetseite? HTML wird
  vom Server geliefert und vom Browser dargestellt.
- **T6.2 — Namensauflösung (DNS).** `www.google.com` → IP-Adresse. Warum
  brauchen wir Namen statt Zahlen? Wer antwortet? (Resolver → DNS-Server).
  ✅ Check: student must order the steps and name what DNS returns.
- **T6.3 — Der komplette Ablauf,** as the student must be able to describe it:
  1. URL im Browser eingeben
  2. Browser fragt den DNS-Server nach der IP-Adresse
  3. DNS antwortet mit der IP-Adresse
  4. Browser schickt einen **HTTP-Request** an diese IP
  5. Request geht über Router → Modem → Provider → durch das Internet zum Server
  6. Der Server antwortet mit einer **HTTP-Response** (die HTML-Seite)
  7. Der Browser stellt die HTML-Seite dar (und lädt Bilder, CSS, … nach)
  ✅ Check: drag-and-drop ordering of the 7 steps + a packet animation the
  student steps through; the student must name what happens at each hop.
- **T6.4 — HTTP vs. HTTPS.** HTTPS = Verschlüsselung + Authentifizierung
  (per Lehrplan). Was sieht ein Mitleser bei HTTP, was bei HTTPS?
  ✅ Check: toggle HTTPS in the simulation and show the readable vs. encrypted
  packet content.
- **T6.5 — Der Weg der Daten im Internet.** Routing über viele Zwischenstationen
  — connect back to `tracert` (T5.5).
  ✅ Check: student routes a packet through a multi-router internet topology and
  sees an alternative path when a link fails.
- **T6.6 — Verbindung des lokalen Netzwerks mit dem Internet.** Where the LAN
  ends and the WAN begins; NAT in kid-friendly terms (one external address,
  many devices) — see T3.4.

### M7 — Anonymität & Spuren im Internet

The Lehrplan explicitly wants *"zu erkennen, dass es nur eine vermeintliche
Anonymität in einem Netzwerk gibt."*

- **T7.1 — Welche Spuren hinterlasse ich?** IP-Adresse, Browser, Uhrzeit,
  besuchte Seite.
- **T7.2 — Server-Logs.** Show a real-looking log line and let the student pick
  out what identifies them.
  ✅ Check: highlight the identifying fields in a log line.
- **T7.3 — Cookies.** Ein Wert, der im **Browser des Benutzers** gespeichert
  wird (recurring Quali multiple choice).
- **T7.4 — Tracking / Google Analytics.** Wer sieht was über mich?
- **T7.5 — Schlussfolgerung.** Warum bin ich im Netz nicht anonym? Wer könnte
  mich identifizieren (Website-Betreiber, Provider)?
  ✅ Check: free-text/MC on who can see what.

### M8 — Begriffe & Abkürzungen (Quali drill)

Short-answer drill, all recurring exam items:
**IP** = Internet Protocol · **LAN** = Local Area Network · **WLAN** ·
**WAN/MAN/GAN** · **www** = World Wide Web · **DNS** · **DHCP** = Dynamic Host
Configuration Protocol · **HTTP / HTTPS** · **RJ-45** · **NAS** · **VoIP** =
Telefonieren übers Internet · **URL** · **Cookie** · **Browser** (Chrome,
Firefox, Safari — Discord ist keiner).
✅ Check: timed flashcard / MC mode with a per-student score.

---

## 5. What the tool must be able to do

Derived from the tasks above.

**Design surface**
- Drag & drop palette: Router, Switch, Access Point, Repeater, Modem, ONT/
  Glasfaser-Dose, Firewall, Server, NAS, DHCP-Server, DNS-Server, Internet-Wolke,
  PC, Laptop, Smartphone, Tablet, Konsole, Drucker, Smart-TV, IoT.
  (The existing draw.io library `Netzwerkgeräte.xml` is the visual reference.)
- Two cable types: **Kabel (LAN)** and **WLAN** — with the rule that a Repeater
  connects wirelessly and an Access Point by cable.
- Per-device property panel: name, internal IP, external IP, MAC, gateway,
  ping (ms), link speed (Mbit/s) — the exact fields the homework asks for.
- Free placement, snapping, connectors that stay attached when a device moves,
  layers, room/floor background — so a *home* network can be drawn realistically.

**Simulation surface**
- Assign IPs manually **or** via DHCP from the router, and show what breaks when
  DHCP is off or two addresses collide.
- A console with `ipconfig`, `ping`, `arp -a`, `tracert` operating on the
  student's own drawn network.
- Animated packet walk for the URL → page flow, with DNS lookup, HTTP request
  and HTTP response as visible, inspectable packets.
- An "internet" beyond the router: several routers, a DNS server, a web server,
  so routing and traceroute are real, not decorative.
- Fault injection for the troubleshooting chain (T5.7).
- HTTP vs. HTTPS packet-content toggle (T6.4).
- Server log / cookie view for the anonymity module (M7).

**Checking surface (the "did they do it themselves" part)**
- Rule-based validation of topology, addressing and recorded measurements —
  not a stored solution file, so it works on each student's *own* home network.
- Per-student seeded task variants (different numbers, different device sets) so
  answers can't simply be copied.
- Step-by-step progress per task ID with a teacher dashboard.
- Free-text answers graded against the Quali model answers (M1.2, T3.1, T4.1, T6.3).

---

## 6. Explicitly out of scope

Per Lehrplan and the exams — do **not** teach or require:
- Subnetting, subnet masks, CIDR (*"IP-Adresse ohne Subnetz"*)
- IPv6 beyond mentioning that it exists
- OSI 7-layer model, TCP vs. UDP, port numbers
- VLANs, static routing tables, real router CLI configuration

---

## 7. Non-network Quali content (for context, not for this tool)

The Quali Informatik is 90 points: Theorie 30 / Datenverarbeitung 30 /
Programmieren 30. Only part of Theorie is networking. The rest —
**Hardware** (CPU, RAM, Festplatte, Grafikkarte, Peripherie),
**Excel** (absolute Bezüge `$G$2`, SUMME/MITTELWERT/MAX/MIN/WENN, Währungsformat,
Säulen- und Kreisdiagramm), **Flussdiagramm/Aktivitätsdiagramm** and
**Scratch** — is taught with other material and is not covered here.
