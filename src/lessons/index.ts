import type { Lesson } from '../model/types'
import { m4Binaer } from './m4-binaer'
import { m8Abkuerzungen } from './m8-abkuerzungen'

/**
 * Lessons are content, deliberately kept clear of the engine (ARCHITECTURE.md
 * §8) so tasks can be added or reworded without touching simulation code.
 *
 * M1-M3 and M5-M7 need the network editor and arrive with it.
 */
export const LESSONS: Lesson[] = [m4Binaer, m8Abkuerzungen]

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}
