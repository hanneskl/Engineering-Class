import type { Lesson } from '../model/types'
import { m2Netzwerk } from './m2-netzwerk'
import { m4Binaer } from './m4-binaer'
import { m8Abkuerzungen } from './m8-abkuerzungen'

/**
 * Lessons are content, deliberately kept clear of the engine (ARCHITECTURE.md
 * §8) so tasks can be added or reworded without touching simulation code.
 *
 * M1, M3 and M5-M7 still to come; M3's addressing work currently lives
 * inside M2's last two tasks.
 */
export const LESSONS: Lesson[] = [m2Netzwerk, m4Binaer, m8Abkuerzungen]

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}
