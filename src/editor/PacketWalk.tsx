import { useMemo } from 'react'
import {
  DNS_STATION,
  HOSTS,
  STEPS,
  answerFrage,
  frageById,
  frageKey,
  framesFor,
  restart,
  stationsFor,
  stepTo,
  type Protocol,
  type Station,
  type Walk,
  type WalkContext,
} from '../model/web'
import { FrageCard } from './FrageCard'

/**
 * The packet walk: an address bar, the road the packet takes, and one card per
 * station. Everything on screen is derived from the student's own network plus
 * the site they picked, so the route really does change when they do.
 */

const W = 960
const H = 300
/** Row the stations sit on; the DNS server sits above it. */
const ROW = 202
const DNS_Y = 58
const BOX_W = 138
const BOX_H = 62
/** The band behind the stations, which the zone labels sit at the foot of. */
const BAND = { y: 132, h: 152 }

function layout(stations: Station[]): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>()
  const left = 20 + BOX_W / 2
  const span = W - 2 * left
  stations.forEach((s, i) => {
    const x = stations.length === 1 ? W / 2 : left + (span * i) / (stations.length - 1)
    map.set(s.id, { x, y: ROW })
  })
  // The DNS server belongs to the provider, so it hangs above the first
  // stretch of the internet rather than above the flat.
  const grenzeX = boundaryX(stations, map)
  map.set(DNS_STATION.id, { x: Math.min(W - left, grenzeX + 90), y: DNS_Y })
  return map
}

/** Halfway between the last device at home and the first one out in the world. */
function boundaryX(stations: Station[], map: Map<string, { x: number; y: number }>): number {
  const lastLan = [...stations].reverse().find((s) => s.zone === 'lan')
  const firstWan = stations.find((s) => s.zone === 'wan')
  const a = lastLan ? map.get(lastLan.id)!.x : 0
  const b = firstWan ? map.get(firstWan.id)!.x : W
  return (a + b) / 2
}

export function PacketWalk({
  ctx,
  walk,
  onWalk,
}: {
  ctx: WalkContext
  walk: Walk
  onWalk: (next: Walk) => void
}) {
  const stations = useMemo(() => stationsFor(ctx), [ctx])
  const frames = useMemo(() => framesFor(ctx), [ctx])
  const pos = useMemo(() => layout(stations), [stations])
  const grenzeX = boundaryX(stations, pos)

  const started = walk.frame >= 0
  const frame = started ? frames[Math.min(walk.frame, frames.length - 1)]! : undefined
  const at = frame ? (pos.get(frame.at) ?? { x: W / 2, y: ROW }) : undefined
  const isLast = walk.frame >= frames.length - 1
  const frage = frame?.frage ? frageById(frame.frage) : undefined
  const chosen = frage ? walk.answers[frageKey(frage, ctx)] : undefined

  const alle: Station[] = [...stations, DNS_STATION]

  return (
    <div className="walk">
      <div className="walk-bar">
        <span className="walk-proto" role="group" aria-label="Protokoll">
          {(['http', 'https'] as Protocol[]).map((p) => (
            <button
              key={p}
              className={ctx.protocol === p ? 'seg on' : 'seg'}
              aria-pressed={ctx.protocol === p}
              onClick={() => onWalk(restart(walk, { protocol: p }))}
            >
              {p}://
            </button>
          ))}
        </span>
        <select
          aria-label="Internetseite"
          value={ctx.host}
          onChange={(e) => onWalk(restart(walk, { host: e.target.value }))}
        >
          {HOSTS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <button className="primary" onClick={() => onWalk(stepTo(walk, ctx, 0))}>
          {started ? 'Neu starten' : 'Seite aufrufen'}
        </button>
      </div>

      <svg
        className="walk-map"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Weg des Pakets von ${ctx.deviceName} zu ${ctx.host}`}
      >
        <rect
          className="zone lan"
          x="8"
          y={BAND.y}
          width={grenzeX - 16}
          height={BAND.h}
          rx="10"
        />
        <rect
          className="zone wan"
          x={grenzeX + 8}
          y={BAND.y}
          width={W - grenzeX - 16}
          height={BAND.h}
          rx="10"
        />
        <text className="zone-label" x="22" y={BAND.y + BAND.h - 12}>
          Heimnetz (LAN)
        </text>
        <text className="zone-label" x={grenzeX + 22} y={BAND.y + BAND.h - 12}>
          Internet (WAN)
        </text>
        <line
          className="grenze"
          x1={grenzeX}
          y1={BAND.y - 10}
          x2={grenzeX}
          y2={BAND.y + BAND.h + 4}
        />

        {/* The road: one segment between neighbouring stations. */}
        {stations.slice(0, -1).map((s, i) => {
          const a = pos.get(s.id)!
          const b = pos.get(stations[i + 1]!.id)!
          return (
            <line
              key={s.id}
              className="walk-road"
              x1={a.x + BOX_W / 2}
              y1={a.y}
              x2={b.x - BOX_W / 2}
              y2={b.y}
            />
          )
        })}
        {/* The side trip to the DNS server. */}
        <path
          className="walk-road dashed"
          d={`M ${grenzeX} ${ROW - BOX_H / 2 - 6} L ${pos.get(DNS_STATION.id)!.x} ${DNS_Y + BOX_H / 2}`}
        />

        {alle.map((s) => {
          const p = pos.get(s.id)!
          const here = frame?.at === s.id
          return (
            <g key={s.id} className={`walk-station${here ? ' here' : ''} zone-${s.zone}`}>
              <rect
                x={p.x - BOX_W / 2}
                y={p.y - BOX_H / 2}
                width={BOX_W}
                height={BOX_H}
                rx="9"
              />
              <text className="wt-label" x={p.x} y={p.y - (s.rolle ? 10 : 3)}>
                {s.label}
              </text>
              <text className="wt-sub" x={p.x} y={p.y + (s.rolle ? 6 : 14)}>
                {s.sub}
              </text>
              {s.rolle && (
                <text className="wt-rolle" x={p.x} y={p.y + 21}>
                  {s.rolle}
                </text>
              )}
            </g>
          )
        })}

        {at && (
          <g className="packet" style={{ transform: `translate(${at.x}px, ${at.y - 46}px)` }}>
            <rect x="-34" y="-15" width="68" height="26" rx="6" />
            <text x="0" y="3">
              Paket
            </text>
          </g>
        )}
      </svg>

      {!started ? (
        <p className="walk-idle">
          Wähl eine Seite und drück auf <strong>Seite aufrufen</strong>. Dann läufst du mit
          dem Paket Station für Station mit.
        </p>
      ) : (
        <div className="walk-step">
          <div className="walk-step-head">
            <span className="badge">Schritt {frame!.n} von 7</span>
            <h3>{STEPS[frame!.n - 1]}</h3>
          </div>
          <p>{frame!.what}</p>

          {frame!.packet && (
            <div className={`packet-view${frame!.packet.verschluesselt ? ' sealed' : ''}`}>
              <span className="packet-title">{frame!.packet.titel}</span>
              {frame!.packet.zeilen.map((z, i) => (
                <code key={i}>{z}</code>
              ))}
            </div>
          )}

          {/* The payoff: after seven steps there is actually a page. */}
          {frame!.n === STEPS.length && (
            <div className="page-view">
              <div className="page-bar">
                <span className="page-lock">{ctx.protocol === 'https' ? '🔒' : '⚠'}</span>
                {ctx.protocol}://{ctx.host}
              </div>
              <div className="page-body">
                <h4>{ctx.host}</h4>
                <p>
                  Fertig. Die Seite hat {stations.length} Stationen gebraucht — hin und
                  wieder zurück.
                </p>
              </div>
            </div>
          )}

          {frame!.offen && (
            <p className={`mitleser${ctx.protocol === 'https' ? ' safe' : ''}`}>
              <strong>Mitleser:</strong>{' '}
              {ctx.protocol === 'https'
                ? 'Wer das Paket hier abfängt, sieht nur, wer mit wem redet. Der Inhalt ist verschlüsselt.'
                : 'Wer das Paket hier abfängt, kann alles lesen — Adresse und Inhalt.'}
            </p>
          )}

          {frage && (
            <FrageCard
              text={frage.text}
              optionen={frage.optionen.map((o) => ({
                text: o.text,
                ok: o.ok(ctx),
                warum: o.warum,
              }))}
              chosen={chosen}
              onChoose={(o) =>
                onWalk(
                  answerFrage(walk, ctx, frage, frage.optionen.find((x) => x.text === o.text)!),
                )
              }
            />
          )}

          <div className="walk-controls">
            <button
              className="ghost small"
              disabled={walk.frame <= 0}
              onClick={() => onWalk(stepTo(walk, ctx, walk.frame - 1))}
            >
              ← Zurück
            </button>
            <span className="walk-count">
              Station {walk.frame + 1} von {frames.length}
            </span>
            <button
              className="primary"
              disabled={isLast}
              onClick={() => onWalk(stepTo(walk, ctx, walk.frame + 1))}
            >
              {isLast ? 'Am Ziel' : 'Weiter →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
