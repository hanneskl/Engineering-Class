import { describe, expect, it } from 'vitest'
import { checkAddress, ipconfigFor, m3Adressen } from '../lessons/m3-adressen'

describe('M3 ipconfig printout', () => {
  it('is stable per seed and differs between seeds', () => {
    expect(ipconfigFor(7)).toEqual(ipconfigFor(7))
    const ips = new Set([1, 2, 3, 4, 5, 6].map((s) => ipconfigFor(s).ip))
    expect(ips.size).toBeGreaterThan(1)
  })

  it('puts the gateway in the same network as the own address, ending in .1', () => {
    const { ip, gateway } = ipconfigFor(42)
    expect(gateway).toBe(ip.split('.').slice(0, 3).join('.') + '.1')
    expect(ipconfigFor(42).text).toContain(`IPv4-Adresse  . . . . . . . . . . : ${ip}`)
  })
})

describe('reading an address off the printout', () => {
  const { ip, gateway } = ipconfigFor(42)

  it('accepts the exact address, ignoring surrounding whitespace', () => {
    expect(checkAddress(`  ${ip} `, ip, gateway, 'der Router').ok).toBe(true)
  })

  it('names the mix-up when the other line was copied', () => {
    const r = checkAddress(gateway, ip, gateway, 'das Standardgateway, also der Router')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('OTHER_LINE')
  })

  it('explains the format when the answer is not an address at all', () => {
    const r = checkAddress('192.168', ip, gateway, 'der Router')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('FORMAT')
  })
})

describe('M3 tasks', () => {
  it('builds eleven tasks with unique ids, choices shuffled per student', () => {
    const a = m3Adressen.buildTasks(1)
    const b = m3Adressen.buildTasks(2)
    expect(a).toHaveLength(11)
    expect(new Set(a.map((t) => t.id)).size).toBe(a.length)
    const choiceA = a.find((t) => t.id === 'm3-warum')!
    const choiceB = b.find((t) => t.id === 'm3-warum')!
    expect([...choiceA.options!].sort()).toEqual([...choiceB.options!].sort())
    expect(choiceA.check(choiceA.options!.find((o) => o.startsWith('Damit jedes'))!).ok).toBe(true)
  })
})
