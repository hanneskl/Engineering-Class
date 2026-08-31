/**
 * Core task model.
 *
 * Per ARCHITECTURE.md §5.1 a check never returns a bare boolean: with no
 * teacher present to interpret a failure, every wrong answer must come back
 * with a German diagnosis the student can act on.
 */

export type CheckResult =
  | { ok: true; message?: string }
  | { ok: false; code: string; message: string; why?: string }

/** Three rungs of the hint ladder (ARCHITECTURE.md §5.2). */
export type Hints = {
  /** Nudge — points at the right place without giving anything away. */
  stups: string
  /** Names the rule being broken, or the method to apply. */
  hinweis: string
  /** The answer, plus why it is the answer. */
  loesung: string
}

export type TaskKind =
  /** Numeric answer, exactly checkable (binary conversion). */
  | 'numeric'
  /** Short text answer, checked against required keywords. */
  | 'text'
  /** Multiple choice. */
  | 'choice'
  /**
   * Free-text concept question. The tool cannot grade German prose reliably
   * and a false "wrong" is poison with no teacher in the room, so the student
   * writes their answer, sees the model answer, and marks themselves.
   */
  | 'self'

export type Task = {
  id: string
  kind: TaskKind
  /** The question as the student sees it. */
  prompt: string
  /** Optional second line — units, format, worked-example pointer. */
  note?: string
  /** Options for `kind: 'choice'`. */
  options?: string[]
  /** The model answer, shown after a correct answer or on "Lösung zeigen". */
  answer: string
  hints: Hints
  check: (raw: string) => CheckResult
  /** Renders the Stellenwert helper table for binary tasks. */
  helper?: { type: 'stellenwert'; value: number; direction: 'toBinary' | 'toDecimal' }
}

export type Lesson = {
  id: string
  /** "M4" */
  module: string
  title: string
  /** The Erklären phase — shown before the exercises. */
  intro: { heading: string; body: string[] }
  /** Why this matters for the Quali. */
  quali: string
  /** Built per student, so the numbers differ between them. */
  buildTasks: (seed: number) => Task[]
}
