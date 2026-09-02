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

type LessonBase = {
  id: string
  /** "M4" */
  module: string
  title: string
  /** The Erklären phase — shown before the exercises. */
  intro: { heading: string; body: string[] }
  /** Why this matters for the Quali. */
  quali: string
}

/** Question-and-answer modules: M4, M8. */
export type QuizLesson = LessonBase & {
  kind: 'quiz'
  /** Built per student, so the numbers differ between them. */
  buildTasks: (seed: number) => Task[]
}

/**
 * Modules where the student draws a network and rules judge the drawing.
 * The task is passed when every rule comes back clean.
 */
/**
 * One goal on the task's checklist, together with the rules that decide
 * whether it is met. Keeping the two in one place means the tick and the
 * check can never drift apart.
 */
export type Ziel = {
  text: string
  rules: import('./rules').Rule[]
}

export type BuildTask = {
  id: string
  title: string
  /** What to build, in one or two sentences. */
  brief: string
  /** The checklist. The task is done when every goal is ticked. */
  ziele: Ziel[]
  hints: Hints
  /**
   * Where the canvas starts when the task is opened for the first time.
   * 'previous' carries the network built in the task before forward, so a
   * brief that says "erweitere das Netz" is telling the truth.
   */
  startFrom?: 'empty' | 'previous'
  /** Devices already on the canvas when the task opens. */
  starter?: import('./plan').Plan
}

/** Every rule a task checks, flattened out of its checklist. */
export function taskRules(task: BuildTask): import('./rules').Rule[] {
  return task.ziele.flatMap((z) => z.rules)
}

export function zielFindings(
  plan: import('./plan').Plan,
  ziel: Ziel,
): import('./rules').Finding[] {
  return ziel.rules.flatMap((rule) => rule(plan))
}

/**
 * A goal is ticked only once there is something on the canvas.
 *
 * Most rules are vacuously satisfied by an empty plan — with no devices, no
 * address can be duplicated and nothing is disconnected. Ticking "Alle Adressen
 * liegen im selben Netz" before the student has drawn anything would be true
 * and useless, so the checklist starts empty and fills up as they work.
 */
export function zielMet(plan: import('./plan').Plan, ziel: Ziel): boolean {
  return plan.devices.length > 0 && zielFindings(plan, ziel).length === 0
}

export type BuildLesson = LessonBase & {
  kind: 'build'
  tasks: BuildTask[]
}

/** Modules where the student draws a flowchart and rules judge the diagram. */
export type FlowZiel = {
  text: string
  rules: import('./flowRules').FlowRule[]
}

export type FlowTask = {
  id: string
  title: string
  brief: string
  ziele: FlowZiel[]
  hints: Hints
  starter?: import('./flow').Flow
}

export type FlowLesson = LessonBase & {
  kind: 'flow'
  tasks: FlowTask[]
}

export function flowTaskRules(task: FlowTask): import('./flowRules').FlowRule[] {
  return task.ziele.flatMap((z) => z.rules)
}

export function flowZielFindings(
  flow: import('./flow').Flow,
  ziel: FlowZiel,
): import('./rules').Finding[] {
  return ziel.rules.flatMap((rule) => rule(flow))
}

/** Like zielMet: nothing ticks while the canvas is still empty. */
export function flowZielMet(flow: import('./flow').Flow, ziel: FlowZiel): boolean {
  return flow.nodes.length > 0 && flowZielFindings(flow, ziel).length === 0
}

/** Modules where the student runs commands against a network. */
export type ConsoleZiel = {
  text: string
  rules: import('./consoleRules').ConsoleRule[]
}

export type ConsoleTask = {
  id: string
  title: string
  brief: string
  ziele: ConsoleZiel[]
  hints: Hints
}

export type ConsoleLesson = LessonBase & {
  kind: 'console'
  tasks: ConsoleTask[]
  /** Network used when the student has not drawn one of their own yet. */
  starter: import('./plan').Plan
}

export function consoleTaskRules(task: ConsoleTask): import('./consoleRules').ConsoleRule[] {
  return task.ziele.flatMap((z) => z.rules)
}

export function consoleZielFindings(
  state: import('./consoleRules').ConsoleState,
  ziel: ConsoleZiel,
): import('./rules').Finding[] {
  return ziel.rules.flatMap((rule) => rule(state))
}

export function consoleZielMet(
  state: import('./consoleRules').ConsoleState,
  ziel: ConsoleZiel,
): boolean {
  return consoleZielFindings(state, ziel).length === 0
}

/** Modules where the student walks a packet from a URL to the screen. */
export type WebZiel = {
  text: string
  rules: import('./webRules').WebRule[]
}

export type WebTask = {
  id: string
  title: string
  brief: string
  ziele: WebZiel[]
  hints: Hints
  /** Also show the "put the seven steps in order" exercise below the walk. */
  reihenfolge?: boolean
}

export type WebLesson = LessonBase & {
  kind: 'web'
  tasks: WebTask[]
}

export function webTaskRules(task: WebTask): import('./webRules').WebRule[] {
  return task.ziele.flatMap((z) => z.rules)
}

export function webZielFindings(
  state: import('./webRules').WebState,
  ziel: WebZiel,
): import('./rules').Finding[] {
  return ziel.rules.flatMap((rule) => rule(state))
}

export function webZielMet(
  state: import('./webRules').WebState,
  ziel: WebZiel,
): boolean {
  return webZielFindings(state, ziel).length === 0
}

export type Lesson = QuizLesson | BuildLesson | FlowLesson | ConsoleLesson | WebLesson
