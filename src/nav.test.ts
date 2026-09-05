import { describe, expect, it } from 'vitest'
import { hashForRoute, routeFromHash } from './nav'

const knownLesson = (id: string) => id === 'm2-netzwerk'

describe('routeFromHash', () => {
  it('reads a valid lesson id out of the hash', () => {
    expect(routeFromHash('#/m2-netzwerk', knownLesson)).toEqual({
      kind: 'lesson',
      lessonId: 'm2-netzwerk',
    })
  })

  it('treats no hash, an empty hash, and a bare "#/" as home', () => {
    expect(routeFromHash('', knownLesson)).toEqual({ kind: 'home' })
    expect(routeFromHash('#', knownLesson)).toEqual({ kind: 'home' })
    expect(routeFromHash('#/', knownLesson)).toEqual({ kind: 'home' })
  })

  it('sends an unknown or stale lesson id home rather than to a blank screen', () => {
    expect(routeFromHash('#/does-not-exist', knownLesson)).toEqual({ kind: 'home' })
  })

  it('decodes a percent-encoded id', () => {
    expect(routeFromHash('#/m2%2Dnetzwerk', knownLesson)).toEqual({
      kind: 'lesson',
      lessonId: 'm2-netzwerk',
    })
  })
})

describe('hashForRoute', () => {
  it('is the inverse of routeFromHash for a lesson', () => {
    const route = { kind: 'lesson', lessonId: 'm2-netzwerk' } as const
    expect(routeFromHash(hashForRoute(route), knownLesson)).toEqual(route)
  })

  it('writes home as "#/", not empty — an explicit hash is what makes leaving a module a distinct, back-able step', () => {
    expect(hashForRoute({ kind: 'home' })).toBe('#/')
  })
})
