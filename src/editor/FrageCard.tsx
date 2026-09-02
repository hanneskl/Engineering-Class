/**
 * A multiple-choice question with a reason for whatever was picked.
 *
 * Every module that asks one asks it the same way (ARCHITECTURE.md §5.1): the
 * options are answers a student might really give, and choosing one — right or
 * wrong — comes back with why it is or is not the answer. A bare cross would
 * be useless with no teacher in the room.
 */

export type FrageOption = { text: string; ok: boolean; warum: string }

export function FrageCard({
  text,
  optionen,
  chosen,
  onChoose,
}: {
  text: string
  optionen: FrageOption[]
  /** The option text the student picked, if any. */
  chosen?: string
  onChoose: (option: FrageOption) => void
}) {
  const gewaehlt = optionen.find((o) => o.text === chosen)
  return (
    <div className="frage">
      <p className="frage-text">{text}</p>
      <div className="frage-optionen">
        {optionen.map((o) => {
          const picked = o.text === chosen
          return (
            <button
              key={o.text}
              className={`option${picked ? (o.ok ? ' ok' : ' bad') : ''}`}
              aria-pressed={picked}
              onClick={() => onChoose(o)}
            >
              {o.text}
            </button>
          )
        })}
      </div>
      {gewaehlt && (
        <p className={`frage-warum${gewaehlt.ok ? ' ok' : ' bad'}`}>{gewaehlt.warum}</p>
      )}
    </div>
  )
}
