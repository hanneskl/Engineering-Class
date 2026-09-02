import type { Lesson } from '../model/types'
import { m2Netzwerk } from './m2-netzwerk'
import { m4Binaer } from './m4-binaer'
import { m5Befehle } from './m5-befehle'
import { m6Internetseite } from './m6-internetseite'
import { m8Abkuerzungen } from './m8-abkuerzungen'
import { m9Flussdiagramm } from './m9-flussdiagramm'

/**
 * Lessons are content, deliberately kept clear of the engine (ARCHITECTURE.md
 * §8) so tasks can be added or reworded without touching simulation code.
 *
 * M1 and M7 still to come; M3's addressing work lives inside M2's
 * last two tasks.
 */
export const LESSONS: Lesson[] = [
  m2Netzwerk,
  m5Befehle,
  m6Internetseite,
  m4Binaer,
  m8Abkuerzungen,
  m9Flussdiagramm,
]

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}
