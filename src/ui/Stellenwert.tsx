/**
 * The Stellenwert table exactly as it appears in the class slides: Stelle 1 is
 * the smallest place (value 1) and sits at the *right* of the binary number.
 *
 * `reveal` is what separates the two hint rungs. At "Hinweis" the table is
 * blank — it hands the student the method and lets them fill it in. Only at
 * "Lösung zeigen" are the bits filled in.
 */
export function Stellenwert({
  value,
  direction,
  reveal,
}: {
  value: number
  direction: 'toBinary' | 'toDecimal'
  reveal: boolean
}) {
  const bits = value.toString(2)
  // Stelle 1 first, then displayed largest-first like the slides.
  const places = [...bits].reverse().map((bit, i) => ({
    stelle: i + 1,
    wert: 2 ** i,
    gesetzt: bit === '1',
  }))

  return (
    <div className="stellenwert">
      <table>
        <thead>
          <tr>
            <th>Stelle</th>
            <th>Wert</th>
            <th>Gesetzt</th>
          </tr>
        </thead>
        <tbody>
          {[...places].reverse().map((p) => (
            <tr key={p.stelle} className={reveal && p.gesetzt ? 'set' : ''}>
              <td>{p.stelle}</td>
              <td>
                2<sup>{p.stelle - 1}</sup> = {p.wert}
              </td>
              <td>{reveal ? (p.gesetzt ? '1' : '0') : <span className="blank">?</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="stellenwert-note">
        {reveal
          ? direction === 'toBinary'
            ? `Von unten nach oben gelesen ergibt die Spalte "Gesetzt" die Binärzahl ${bits}.`
            : `Die Werte mit einer 1 zusammengezählt ergeben ${value}.`
          : direction === 'toBinary'
            ? 'Füll die Spalte "Gesetzt" von oben nach unten aus und lies sie dann von unten nach oben.'
            : 'Trag ein, an welchen Stellen eine 1 steht, und zähl deren Werte zusammen.'}
      </p>
    </div>
  )
}
