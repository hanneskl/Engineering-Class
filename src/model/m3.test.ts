import { describe, expect, it } from 'vitest'
import {
  checkAddress,
  checkHostanteil,
  checkRange,
  hostanteilFor,
  ipconfigFor,
  m3Adressen,
  rangeFor,
} from '../lessons/m3-adressen'

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
  it('builds seventeen tasks with unique ids, choices shuffled per student', () => {
    const a = m3Adressen.buildTasks(1)
    const b = m3Adressen.buildTasks(2)
    expect(a).toHaveLength(17)
    expect(new Set(a.map((t) => t.id)).size).toBe(a.length)
    const choiceA = a.find((t) => t.id === 'm3-warum')!
    const choiceB = b.find((t) => t.id === 'm3-warum')!
    expect([...choiceA.options!].sort()).toEqual([...choiceB.options!].sort())
    expect(choiceA.check(choiceA.options!.find((o) => o.startsWith('Damit jedes'))!).ok).toBe(true)
  })

  it('keeps every existing task id, so no student loses progress', () => {
    const ids = m3Adressen.buildTasks(1).map((t) => t.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'm3-warum',
        'm3-was',
        'm3-gueltig',
        'm3-wer',
        'm3-ipconfig-befehl',
        'm3-ipconfig-ip',
        'm3-ipconfig-gw',
        'm3-privat',
        'm3-extern',
        'm3-gateway',
        'm3-mac',
      ]),
    )
  })

  it('asks in the order of the briefing', () => {
    expect(m3Adressen.buildTasks(1).map((t) => t.id.replace('m3-', ''))).toEqual([
      'warum',
      'was',
      'anteile',
      'gueltig',
      'hostanteil',
      'wer',
      'range',
      'statisch',
      'apipa',
      'ipconfig-befehl',
      'ipconfig-ip',
      'ipconfig-gw',
      'privat',
      'bereiche',
      'extern',
      'gateway',
      'mac',
    ])
  })
})

const SEEDS = Array.from({ length: 300 }, (_, i) => i * 7919 + 1)

const isPrivate = (ip: string) => {
  const [a, b] = ip.split('.').map(Number) as [number, number]
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

describe('M3 Hostanteil', () => {
  const ip = '172.18.225.72'

  it('keeps every seeded address in a private range, with four valid blocks', () => {
    for (const seed of SEEDS) {
      const { ip: address } = hostanteilFor(seed)
      expect(isPrivate(address)).toBe(true)
      const blocks = address.split('.').map(Number)
      expect(blocks).toHaveLength(4)
      for (const n of blocks) expect(n).toBeLessThanOrEqual(255)
    }
  })

  it('uses all three private ranges across students', () => {
    const firsts = new Set(SEEDS.map((s) => hostanteilFor(s).ip.split('.')[0]))
    expect(firsts).toEqual(new Set(['10', '172', '192']))
  })

  it('is stable per seed and its answer is the last number', () => {
    expect(hostanteilFor(7)).toEqual(hostanteilFor(7))
    const { ip: address, netz, host } = hostanteilFor(7)
    expect(address).toBe(`${netz}.${host}`)
  })

  it('accepts the last number', () => {
    expect(checkHostanteil(' 72 ', ip).ok).toBe(true)
  })

  it('names the Netzanteil as its own mistake', () => {
    const r = checkHostanteil('172.18.225', ip)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('NETZANTEIL')
      expect(r.message).toBe('Das ist der Netzanteil.')
    }
  })

  it('names the whole address as its own mistake', () => {
    const r = checkHostanteil(ip, ip)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('WHOLE_ADDRESS')
      expect(r.message).toBe('Das ist die ganze Adresse.')
    }
  })

  it('rejects any other number', () => {
    const r = checkHostanteil('18', ip)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('WRONG')
  })
})

describe('M3 DHCP range', () => {
  it('always has b > a, a span of 9 to 60, and valid addresses', () => {
    for (const seed of SEEDS) {
      const { a, b, count } = rangeFor(seed)
      expect(b).toBeGreaterThan(a)
      expect(b - a).toBeGreaterThanOrEqual(9)
      expect(b - a).toBeLessThanOrEqual(60)
      expect(b).toBeLessThanOrEqual(254)
      expect(count).toBe(b - a + 1)
    }
  })

  it('accepts b - a + 1, with spaces or a trailing word', () => {
    for (const answer of ['31', ' 31 ', '31 Geräte', '31 geraete', '31 Adressen', '31Adressen']) {
      expect(checkRange(answer, 20, 50).ok).toBe(true)
    }
  })

  it('names the off-by-one as its own mistake', () => {
    const r = checkRange('30', 20, 50)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('OFF_BY_ONE')
      expect(r.message).toBe('Fast – zähl die erste und die letzte Adresse mit.')
    }
  })

  it('takes digits only', () => {
    for (const answer of ['einunddreißig', '-31', '31.', '3 1', '31 PCs']) {
      const r = checkRange(answer, 20, 50)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.code).toBe('FORMAT')
    }
  })

  it('rejects any other number', () => {
    const r = checkRange('50', 20, 50)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('WRONG')
  })
})
