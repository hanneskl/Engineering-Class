/**
 * A multiple-choice question whose every option carries its own explanation.
 *
 * Shared by the modules that ask one (M1 and M7; M6's options depend on the
 * protocol and build this shape at render time). The rule is the same
 * everywhere: no option is ever answered with a bare right or wrong.
 */

export type Option = { text: string; ok: boolean; warum: string }

export type Frage = {
  id: string
  text: string
  optionen: Option[]
}

export function frageAus(fragen: Frage[], id: string): Frage | undefined {
  return fragen.find((f) => f.id === id)
}
