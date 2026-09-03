import { useMemo, useState } from 'react'
import {
  falsch,
  fertig,
  geprueft,
  kartenIn,
  mischen,
  offen,
  place,
  takeBack,
  wurdeGeprueft,
  type Matches,
  type Zuordnung,
} from '../model/match'
import type { Frage } from '../model/frage'
import { answerMatch } from '../model/match'
import { DeviceBild } from './DeviceBild'
import { FrageCard } from './FrageCard'

/**
 * The Zuordnung board: a pile of cards, a row of places, and — once every card
 * is out of the pile — a word about the ones that are lying wrong.
 *
 * Cards are placed by clicking (pick up, then drop) rather than dragged.
 * Dragging is awkward on the school laptops' trackpads and impossible on a
 * tablet, and the same decision was already made for the flowchart's arrows.
 */
export function MatchBoard({
  zuordnung,
  matches,
  seed,
  fragen,
  onMatches,
}: {
  zuordnung?: Zuordnung
  matches: Matches
  seed: number
  fragen?: Frage[]
  onMatches: (next: Matches) => void
}) {
  /** The card in the hand, waiting for a place. */
  const [inDerHand, setInDerHand] = useState<string | null>(null)

  const pile = useMemo(
    () => (zuordnung ? mischen(zuordnung.karten, seed) : []),
    [zuordnung, seed],
  )

  if (!zuordnung) {
    return (
      <div className="board">
        {fragen && <Fragen fragen={fragen} matches={matches} onMatches={onMatches} />}
      </div>
    )
  }

  // Narrowed once, so the callbacks below do not each have to re-check it.
  const z = zuordnung
  const rest = offen(zuordnung, matches)
  const restInPileOrder = pile.filter((k) => rest.includes(k))
  const alleGelegt = fertig(zuordnung, matches)
  /** Feedback starts at the first complete board and then stays on. */
  const zeigeFehler = alleGelegt || wurdeGeprueft(matches, zuordnung.id)
  const daneben = zeigeFehler ? falsch(zuordnung, matches) : []

  function drop(platzId: string) {
    if (!inDerHand) return
    const next = place(matches, inDerHand, platzId)
    onMatches(fertig(z, next) ? geprueft(next, z.id) : next)
    setInDerHand(null)
  }

  return (
    <div className="board">
      <p className="board-auftrag">{zuordnung.auftrag}</p>

      <ol
        className={`plaetze${zuordnung.rang ? ' rang' : ''}${
          !zuordnung.rang && zuordnung.plaetze.length > 3 ? ' viele' : ''
        }`}
      >
        {zuordnung.plaetze.map((p, i) => {
          const drin = kartenIn(zuordnung, matches, p.id)
          const voll = !zuordnung.mehrfach && drin.length > 0
          return (
            <li key={p.id} className="platz">
              <button
                className={`platz-ziel${inDerHand && !voll ? ' offen' : ''}`}
                disabled={!inDerHand || voll}
                aria-label={`Karte hier ablegen: ${p.label}`}
                onClick={() => drop(p.id)}
              >
                {zuordnung.rang && <span className="platz-rang">{i + 1}</span>}
                {p.bild ? (
                  <img className="platz-bild" src={p.bild} alt="" />
                ) : p.icon ? (
                  <span className="platz-bild">
                    <DeviceBild type={p.icon} size={104} />
                  </span>
                ) : (
                  <span className="platz-label">{p.label}</span>
                )}
                {p.sub && <span className="platz-sub">{p.sub}</span>}
              </button>

              <div className="platz-karten">
                {drin.map((k) => {
                  const schief = daneben.includes(k)
                  return (
                    <button
                      key={k.id}
                      className={`karte gelegt${schief ? ' falsch' : zeigeFehler ? ' richtig' : ''}`}
                      onClick={() => onMatches(takeBack(matches, k.id))}
                      title="Zurück in den Stapel"
                    >
                      {k.text}
                    </button>
                  )
                })}
                {!drin.length && <span className="platz-leer">frei</span>}
              </div>
            </li>
          )
        })}
      </ol>

      {restInPileOrder.length > 0 && (
        <div className="pile" aria-label="Karten, die noch nicht liegen">
          {restInPileOrder.map((k) => (
            <button
              key={k.id}
              className={`karte${inDerHand === k.id ? ' in-hand' : ''}`}
              aria-pressed={inDerHand === k.id}
              onClick={() => setInDerHand(inDerHand === k.id ? null : k.id)}
            >
              {k.text}
            </button>
          ))}
        </div>
      )}

      {inDerHand && <p className="board-hinweis">Und jetzt: Wohin damit? Klick den Platz an.</p>}

      {alleGelegt && daneben.length === 0 && (
        <p className="board-verdict ok">Alles richtig zugeordnet.</p>
      )}
      {daneben.length > 0 && (
          <div className="board-verdict bad">
            <p>
              {daneben.length === 1
                ? 'Eine Karte liegt noch falsch:'
                : `${daneben.length} Karten liegen noch falsch:`}
            </p>
            <ul>
              {daneben.map((k) => (
                <li key={k.id}>
                  <strong>{k.text}</strong> — {k.warum}
                </li>
              ))}
            </ul>
          </div>
      )}

      {fragen && <Fragen fragen={fragen} matches={matches} onMatches={onMatches} />}
    </div>
  )
}

function Fragen({
  fragen,
  matches,
  onMatches,
}: {
  fragen: Frage[]
  matches: Matches
  onMatches: (next: Matches) => void
}) {
  return (
    <section className="board-fragen">
      {fragen.map((f) => (
        <FrageCard
          key={f.id}
          text={f.text}
          optionen={f.optionen}
          chosen={matches.answers[f.id]}
          onChoose={(o) => onMatches(answerMatch(matches, f, o))}
        />
      ))}
    </section>
  )
}
