import type { Lesson } from '../model/types'
import { m1Geraete } from './m1-geraete'
import { m2Netzwerk } from './m2-netzwerk'
import { m4Binaer } from './m4-binaer'
import { m5Befehle } from './m5-befehle'
import { m6Internetseite } from './m6-internetseite'
import { m7Spuren } from './m7-spuren'
import { m8Abkuerzungen } from './m8-abkuerzungen'
import { m9Flussdiagramm } from './m9-flussdiagramm'
import { m10Tabellen } from './m10-tabellen'

/**
 * Lessons are content, deliberately kept clear of the engine (ARCHITECTURE.md
 * §8) so tasks can be added or reworded without touching simulation code.
 *
 * M3's addressing work lives inside M2's last two tasks; M1 T1.6 (the
 * router's own web interface) is still open.
 *
 * M10 is the Datenverarbeitung third of the Quali rather than a networking
 * module, which is why it sits last despite being worth the most points.
 */
export const LESSONS: Lesson[] = [
  m1Geraete,
  m2Netzwerk,
  m5Befehle,
  m6Internetseite,
  m7Spuren,
  m4Binaer,
  m8Abkuerzungen,
  m9Flussdiagramm,
  m10Tabellen,
]

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}

/**
 * Every task id in a lesson. Most lessons carry a fixed `tasks` array; the
 * two quiz modules (M4, M8) generate theirs from the student's seed instead,
 * so a caller needs the seed to enumerate them at all.
 */
export function taskIdsFor(lesson: Lesson, seed: number): string[] {
  return lesson.kind === 'quiz'
    ? lesson.buildTasks(seed).map((t) => t.id)
    : lesson.tasks.map((t) => t.id)
}

/**
 * task.id → the module badge of the lesson it belongs to (e.g. 'M2', 'M7').
 * `Progress.tasks` is a single flat map across every module, with no lesson
 * of its own attached — this is how anything that needs to group by module
 * (Home's stats, the progress-sync module) recovers it.
 */
export function moduleByTaskId(seed: number): Map<string, string> {
  const map = new Map<string, string>()
  for (const lesson of LESSONS) {
    for (const id of taskIdsFor(lesson, seed)) map.set(id, lesson.module)
  }
  return map
}
