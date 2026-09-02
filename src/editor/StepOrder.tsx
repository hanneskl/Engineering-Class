import { useMemo } from 'react'
import { STEPS, clearSlot, placeStep, shuffledSteps, type Walk } from '../model/web'

/**
 * "Bring die sieben Schritte in die richtige Reihenfolge" — the ordering task
 * from the Quali, as clicking rather than dragging: a card at a time from the
 * pile into the list, and back out again if it was the wrong one. Dragging is
 * awkward on the school laptops' trackpads and impossible on a tablet.
 */
export function StepOrder({
  walk,
  seed,
  onWalk,
}: {
  walk: Walk
  seed: number
  onWalk: (next: Walk) => void
}) {
  const pile = useMemo(
    () => shuffledSteps(seed).filter((n) => !walk.order.includes(n)),
    [seed, walk.order],
  )
  const complete = pile.length === 0
  const richtig = complete && walk.order.every((n, i) => n === i + 1)

  return (
    <section className="order">
      <h3>Die sieben Schritte in der richtigen Reihenfolge</h3>
      <p className="order-lede">
        Klick die Karten der Reihe nach an — so, wie es beim Aufrufen einer Seite
        wirklich passiert. Ein Klick auf eine gesetzte Karte nimmt sie zurück.
      </p>

      <ol className="order-slots">
        {STEPS.map((_, i) => {
          const n = walk.order[i]
          return (
            <li key={i} className={n ? 'slot filled' : 'slot'}>
              <span className="slot-n">{i + 1}</span>
              {n ? (
                <button
                  className="order-card set"
                  onClick={() => onWalk({ ...walk, order: clearSlot(walk.order, i) })}
                >
                  {STEPS[n - 1]}
                </button>
              ) : (
                <span className="order-empty">…</span>
              )}
            </li>
          )
        })}
      </ol>

      {pile.length > 0 && (
        <div className="order-pile" aria-label="Noch offene Schritte">
          {pile.map((n) => (
            <button
              key={n}
              className="order-card"
              onClick={() => onWalk({ ...walk, order: placeStep(walk.order, n) })}
            >
              {STEPS[n - 1]}
            </button>
          ))}
        </div>
      )}

      {complete && (
        <p className={richtig ? 'order-verdict ok' : 'order-verdict bad'}>
          {richtig
            ? 'Die Reihenfolge stimmt.'
            : 'Noch nicht ganz. Geh den Weg oben noch einmal durch und vergleich.'}
        </p>
      )}
    </section>
  )
}
