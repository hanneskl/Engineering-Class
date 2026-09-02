# Architecture

How the network planning & simulation tool is built. The *what* — the curriculum
and the task inventory — lives in [README.md](README.md). This document is the
*how*.

---

## 1. Settled constraints

| Question | Decision | Consequence |
| --- | --- | --- |
| Teacher dashboard / live progress? | **No.** The tool is used *without the teacher.* | No backend, ever. But the tool must **teach**, not just check — see §5. |
| Offline capability? | **No.** Internet is always available. | No service worker, no offline sync. Plain hosted SPA. |
| Verify the student's real home network? | **Plausibility only.** | T2.4 checks structure and value ranges, never exact values. |

The first decision is the important one. It is not merely "skip the dashboard" —
it means **nobody is there to explain a failure**. That reshapes the whole
product: the explanation layer is now as much work as the simulator, and
probably more.

---

## 2. Core principle: the plan *is* the simulation

Today a student does the work twice — draws the network in draw.io, then rebuilds
it in Filius to simulate it. This tool collapses that into one artifact.

**One JSON document, one graph, no export/import step, no "simulation mode".**
Place a router and it *is* the DHCP server. Draw a cable and it *is* the path a
ping travels. Rendering, simulation, validation and progress all read the same
model.

---

## 3. Data model

```ts
type Plan = {
  studentName: string
  seed: number              // drives per-student task variants
  devices: Device[]
  links: Link[]
}

type DeviceType =
  | 'router' | 'switch' | 'accesspoint' | 'repeater' | 'modem' | 'ont'
  | 'firewall' | 'server' | 'nas' | 'dns' | 'internet'
  | 'pc' | 'laptop' | 'smartphone' | 'tablet' | 'console' | 'printer' | 'tv'

type Device = {
  id: string
  type: DeviceType
  name: string              // "Papas Laptop"
  x: number; y: number
  ports: number             // switch / router
  config: {
    ip?: string
    gateway?: string
    mac: string
    dhcpServer?: boolean
    dhcpRange?: [string, string]
    hostname?: string       // servers: "google.com"
  }
  measured?: {              // what the STUDENT typed in
    pingMs?: number
    speedMbit?: number
  }
}

type Link = {
  id: string
  from: { device: string; port: number }
  to:   { device: string; port: number }
  medium: 'cable' | 'wifi'
}
```

`measured` is deliberately separate from what the engine computes. The gap
between the two is where the teaching happens: *"Du hast 3 ms eingetragen, aber
dieser PC hängt an einem Repeater. Miss noch einmal."*

---

## 4. Simulation engine

The Lehrplan excludes subnetting, OSI, TCP and ports. That is a gift: this is
**not** a Packet Tracer clone. It is graph traversal over ~20 nodes, supporting
six operations:

| Operation | What it does |
| --- | --- |
| `ipconfig` | Report the device's own IP, gateway, MAC |
| `arp -a` | List devices reachable without crossing a router |
| `ping <target>` | Find path, sum latency, report — or fail with a reason |
| `tracert <host>` | Same, listing every hop |
| DNS lookup | Hostname → IP via a DNS server device |
| HTTP request/response | Client → server, as an animated, inspectable packet |

Two firm design calls:

### 4.1 Latency is derived from topology, never random

```
cable            1 ms
wifi             5 ms
wifi via repeater  15 ms
ISP hop           8 ms
```

Ping results are therefore a **consequence of the network the student built**. A
student who hangs their console off a repeater sees a slow ping and can reason
about why. This is what makes the troubleshooting chain (T5.7) teach something
instead of being a quiz with animations attached.

### 4.2 Students build the LAN; the internet is a fixed, pre-built world

Beyond the router sits a prepared topology shipped with the app: a handful of
ISP routers, a DNS resolver, `google.com`'s web server, a few others. Students
do not construct the internet — they **explore** it.

This keeps `tracert` reproducible, gives DNS something real to resolve, supports
the M6 packet walk, and stops the canvas turning into spaghetti.

---

## 5. The teaching loop

**This is the heart of the product**, because the teacher is not present.

Every task runs the same five phases:

1. **Erklären** — a short explanation with a diagram, stating the
   Quali-relevant fact plainly.
2. **Zeigen** — a worked example the student can step through.
3. **Machen** — the exercise, on their own canvas.
4. **Prüfen** — continuous validation *while they work*. No submit button; the
   canvas shows what is still wrong, live.
5. **Helfen** — a hint ladder when they get stuck.

### 5.1 Validators return diagnoses, not booleans

A validator that returns `false` is worthless without a teacher to interpret it.
Every check returns a reason, and every reason has written German text:

```ts
type CheckResult =
  | { ok: true }
  | { ok: false
      code: 'DEVICE_UNREACHABLE' | 'WIFI_DEVICE_CABLED' | 'DUPLICATE_IP' | …
      deviceIds: string[]        // highlight these on the canvas
      message: string            // "Dein Laptop erreicht den Router nicht."
      why: string                // why that matters
    }
```

Writing the ~40–60 failure codes and their German diagnoses is the single
largest content task in the project. Budget for it accordingly.

### 5.2 Hint ladder

Progressive, and always escapable — a stuck student with nobody to ask must be
able to move on:

1. **Stups** — "Schau dir die Verbindung zum Repeater an."
2. **Hinweis** — names the rule that is being broken.
3. **Lösung zeigen** — reveals the answer.

Hint usage is recorded in the progress file. Since there is no live dashboard,
this is how a student's struggle stays visible: they can export the file and
send it in, exactly as they already mail homework to `hannes@kleist.com`.

### 5.3 Progression

Modules unlock in order M1 → M8. The pure quiz modules (M4 Binärzahlen, M8
Abkürzungen) are always available as free practice.

A timed Probequali mode was considered as a capstone and dropped: the modules
already carry the exam questions, and a mock exam with a clock is the one thing
in here that would need a teacher in the room to be worth anything.

---

## 6. Verification

Three kinds of check, per the constraints in §1:

- **Structural** — predicates over the graph. *Exactly one router links to the
  internet; every WLAN device attaches to an AP, not a cable; all IPs unique and
  in one private range.*
- **Behavioural** — an append-only event log. Did they actually open the console
  and run `ping`? This distinguishes "drew a picture" from "did the exercise".
- **Plausibility** — for T2.4, the student's real home network, which no engine
  can verify. Structure and value ranges only.

Per-student task variants are seeded from `Plan.seed`, so the generated numbers
in M4 and the required device sets in M2 differ between students. With a cohort
of six to eight this is a nicety, not an anti-cheat system — the priority is
immediate, specific feedback, not plagiarism detection.

---

## 7. Stack and deployment

- **Vite + TypeScript + React**, SVG canvas (~20 nodes; SVG gives hit-testing
  and accessibility for free)
- **GitHub Pages** — no install, no server, no accounts, no admin rights;
  works on locked-down school machines
- **`localStorage`** for progress, plus explicit JSON export/import
- UI strings in **German**; code and identifiers in English

### Known limitation: shared school computers

`localStorage` is per-browser, not per-student. On a shared machine, progress can
collide or be wiped. With no backend there is no clean fix. Mitigation: the
student enters their name on first run, progress is keyed by name, and export is
offered as a backup they can re-import. Worth revisiting if it bites in practice.

---

## 8. Module layout

```
src/
  model/       plan.ts, devices.ts, validate.ts
  engine/      graph.ts, ping.ts, dns.ts, http.ts, dhcp.ts, world.ts
  editor/      Canvas.tsx, Palette.tsx, Inspector.tsx
  console/     Terminal.tsx, commands/
  lessons/     m1/…  m8/…      ← content: text, checks, hints
  progress/    store.ts, export.ts
```

`lessons/` is deliberately separated from `engine/` so tasks can be written and
edited without touching the simulator.

---

## 9. Build order

1. **M4 Binärzahlen + M8 Abkürzungen** — pure quiz modules, zero dependency on
   the network engine, worth 6+ exam points, roughly a day's work. Ships
   something usable in class immediately.
2. **Editor + data model** — replaces draw.io.
3. **Structural checks for M2** — the first real validation, with German
   diagnoses.
4. **Console + `ipconfig` / `ping` / `arp` / `tracert`** — replaces the cmd
   exercises.
5. **Internet world + DNS + the HTTP packet walk** — M6, the centrepiece and the
   hardest part.
6. **M7 Anonymität** — server logs, cookies.
7. **M1 Geräte & Komponenten** — the Zuordnung the exam opens with. Built last
   on purpose: by then the devices had names, icons and functions everywhere
   else in the tool, so the module only had to ask about them.

All of it is built and deployed. The one task still open is T1.6, a walkthrough
of a simulated router web interface.
