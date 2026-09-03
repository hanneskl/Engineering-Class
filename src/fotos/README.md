# Gerätefotos

Hier liegen die Fotos für M1, Aufgabe 1 ("Die Geräte erkennen"). Sobald eine
Datei hier liegt, ersetzt sie überall die gezeichnete Illustration — es muss
kein Code geändert werden, nur neu gebaut.

## Dateinamen

Der Dateiname ist der Gerätetyp, die Endung ist egal (`.jpg`, `.png`,
`.webp`, `.avif`):

| Datei | Gerät | Vorschlag: Marktführer in Deutschland |
| --- | --- | --- |
| `router.jpg` | Router | **AVM FRITZ!Box 7590** — AVM ist mit Abstand die Nummer eins im deutschen Router-Markt, die Box steht in Millionen Haushalten. |
| `modem.jpg` | Modem | **Telekom Glasfaser-Modem 2** (Glasfaser) oder **Vodafone Station** (Kabel) — das reine Modem ohne Router-Funktion. |
| `switch.jpg` | Switch | **TP-Link TL-SG108** — der meistverkaufte kleine Switch im deutschen Handel; Alternative: Netgear GS308. |
| `accesspoint.jpg` | Access Point | **Ubiquiti UniFi U6+** — die weiße Deckenscheibe, in Schulen und Büros verbreitet; Alternative: Aruba Instant On. |
| `repeater.jpg` | WLAN-Repeater | **AVM FRITZ!Repeater 1200 AX** — passt zur FRITZ!Box und ist in Deutschland der Standard. |
| `server.jpg` | Server | **Dell PowerEdge R760** — Dell führt den Servermarkt an, dicht gefolgt von HPE ProLiant. |
| `nas.jpg` | NAS | **Synology DiskStation DS224+** — Synology ist im deutschen Privat- und SMB-Markt klar vorn, vor QNAP. |
| `printer.jpg` | Drucker | **HP LaserJet** (Stückzahl-Marktführer) oder **Brother** — im Schulumfeld verbreiteter. |

Die Marktführer-Angaben stammen aus dem Modellwissen, nicht aus einer
aktuellen Recherche: Diese Session hat keinen Zugang ins offene Netz.

## Wie die Bilder aussehen sollten

- quadratisch zugeschnitten, Gerät freigestellt oder vor hellem, ruhigem Grund
- mindestens 400 × 400 px, gern 600 × 600; als `.webp` oder `.jpg`
- die Ansicht, an der man das Gerät erkennt: Router und Repeater von vorn,
  Switch schräg von vorn (damit die Buchsenreihe zu sehen ist), Access Point
  von unten/schräg, Drucker mit Papierfach

## Rechte — bitte vorher klären

Produktfotos von Hersteller-Seiten oder aus Shops sind urheberrechtlich
geschützt. Die Seite läuft öffentlich auf GitHub Pages unter deinem Namen,
also braucht es eine saubere Quelle. Drei Wege, vom einfachsten zum
aufwendigsten:

1. **Selbst fotografieren.** Router, Switch, Access Point, Drucker stehen in
   der Schule; FRITZ!Box und Repeater zu Hause. Kostet zehn Minuten, gehört
   dir, und die Geräte sind genau die, die die Schüler kennen.
2. **Wikimedia Commons.** Dort liegen Fotos unter CC-Lizenzen, unter anderem
   von FRITZ!Boxen und Synology-Geräten. Meist CC BY-SA: Urheber und Lizenz
   müssen genannt werden — dafür ist unten der Bildnachweis vorgesehen.
3. **Beim Hersteller anfragen.** AVM, TP-Link und Synology haben
   Presse-Bilddatenbanken; die Nutzungsbedingungen decken in der Regel nur
   redaktionelle Berichterstattung ab. Eine kurze Mail mit dem Hinweis auf ein
   nicht-kommerzielles Schulprojekt reicht erfahrungsgemäß aus.

## Bildnachweis

Wenn Fotos mit Namensnennung dazukommen, trag sie in
`src/lessons/m1-geraete.ts` unter `bildnachweise` ein. Der Block wird dann
unter der Tafel angezeigt.
