import { describe, expect, it } from 'vitest'
import type { Device, DeviceType, Link, Medium, Plan } from './plan'
import { areLinked, sharedMedia } from './plan'
import { pathBetween, reachableFrom } from './topology'
import {
  allConnectedTo,
  evaluateTask,
  isTaskSolved,
  noDuplicateIps,
  checkAlways,
  everyDeviceHasIp,
  ipsInSameNetwork,
  isValidIpv4,
  noDeviceBypassesRouter,
  requireCount,
  routerConnectsToInternet,
  whyCannotLink,
} from './rules'

/** Terse plan builder for tests. */
function build(
  devices: Array<[DeviceType, string] | [DeviceType, string, string]>,
  links: Array<[string, string, Medium]>,
): Plan {
  const ds: Device[] = devices.map(([type, id, ip], i) => ({
    id,
    type,
    name: id,
    x: i * 60,
    y: 0,
    ...(ip ? { ip } : {}),
  }))
  const ls: Link[] = links.map(([from, to, medium], i) => ({
    id: `l${i}`,
    from,
    to,
    medium,
  }))
  return { devices: ds, links: ls }
}

const codes = (fs: { code: string }[]) => fs.map((f) => f.code).sort()

describe('always-on rules', () => {
  it('accepts a correct little home network', () => {
    const plan = build(
      [
        ['internet', 'net'],
        ['router', 'r'],
        ['switch', 'sw'],
        ['pc', 'pc'],
        ['smartphone', 'phone'],
      ],
      [
        ['net', 'r', 'cable'],
        ['r', 'sw', 'cable'],
        ['sw', 'pc', 'cable'],
        ['r', 'phone', 'wifi'],
      ],
    )
    expect(checkAlways(plan)).toEqual([])
  })

  it('refuses a cabled smartphone and says why', () => {
    const plan = build(
      [['router', 'r'], ['smartphone', 'phone']],
      [['r', 'phone', 'cable']],
    )
    const [f] = checkAlways(plan)
    expect(f?.code).toBe('WIFI_ONLY_DEVICE_CABLED')
    expect(f?.message).toContain('phone')
    expect(f?.why).toMatch(/WLAN/)
    expect(f?.deviceIds).toEqual(['phone'])
  })

  it('distinguishes an access point from a repeater by its uplink', () => {
    const wifiOnlyAp = build(
      [['router', 'r'], ['accesspoint', 'ap']],
      [['r', 'ap', 'wifi']],
    )
    expect(codes(checkAlways(wifiOnlyAp))).toContain('AP_WITHOUT_CABLE')

    const cabledRepeater = build(
      [['router', 'r'], ['repeater', 'rep']],
      [['r', 'rep', 'cable']],
    )
    expect(codes(checkAlways(cabledRepeater))).toContain('REPEATER_CABLED')
  })

  it('counts ports', () => {
    const plan = build(
      [['switch', 'sw'], ['pc', 'a'], ['pc', 'b'], ['pc', 'c'], ['pc', 'd'], ['pc', 'e'], ['pc', 'f']],
      [
        ['sw', 'a', 'cable'], ['sw', 'b', 'cable'], ['sw', 'c', 'cable'],
        ['sw', 'd', 'cable'], ['sw', 'e', 'cable'], ['sw', 'f', 'cable'],
      ],
    )
    const [f] = checkAlways(plan).filter((x) => x.code === 'TOO_MANY_LINKS')
    expect(f?.why).toContain('5 Anschlüsse')
  })

  it('catches duplicate and malformed addresses', () => {
    const plan = build(
      [['pc', 'a', '192.168.1.10'], ['pc', 'b', '192.168.1.10'], ['pc', 'c', '192.168.1.300']],
      [],
    )
    expect(codes(checkAlways(plan))).toEqual(['BAD_IP', 'DUPLICATE_IP'])
  })
})

describe('isValidIpv4', () => {
  it('accepts real addresses and rejects impossible ones', () => {
    expect(isValidIpv4('192.168.178.20')).toBe(true)
    expect(isValidIpv4('0.0.0.0')).toBe(true)
    expect(isValidIpv4('192.168.178.300')).toBe(false)
    expect(isValidIpv4('192.168.178')).toBe(false)
    expect(isValidIpv4('192.168.178.a')).toBe(false)
  })
})

describe('task rules', () => {
  const home = (): Plan =>
    build(
      [['internet', 'net'], ['router', 'r'], ['pc', 'pc'], ['laptop', 'lt']],
      [['net', 'r', 'cable'], ['r', 'pc', 'cable'], ['r', 'lt', 'wifi']],
    )

  it('requireCount reports what is missing', () => {
    expect(requireCount('switch', 1)(home())[0]?.message).toContain('fehlt noch ein Switch')
    expect(requireCount('router', 1)(home())).toEqual([])
  })

  it('allConnectedTo names the floating device', () => {
    const plan = home()
    plan.devices.push({ id: 'tv', type: 'tv', name: 'tv', x: 0, y: 0 })
    const [f] = allConnectedTo('router')(plan)
    expect(f?.code).toBe('NOT_CONNECTED')
    expect(f?.deviceIds).toEqual(['tv'])
  })

  it('routerConnectsToInternet accepts a router-modem-internet chain', () => {
    const viaModem = build(
      [['internet', 'net'], ['modem', 'm'], ['router', 'r']],
      [['net', 'm', 'cable'], ['m', 'r', 'cable']],
    )
    expect(routerConnectsToInternet()(viaModem)).toEqual([])

    const dangling = build([['internet', 'net'], ['router', 'r']], [])
    expect(routerConnectsToInternet()(dangling)[0]?.code).toBe('NO_UPLINK')
  })

  it('noDeviceBypassesRouter catches a PC wired straight to the internet', () => {
    const plan = build(
      [['internet', 'net'], ['router', 'r'], ['pc', 'pc']],
      [['net', 'r', 'cable'], ['net', 'pc', 'cable']],
    )
    const [f] = noDeviceBypassesRouter()(plan)
    expect(f?.code).toBe('BYPASSES_ROUTER')
    expect(f?.deviceIds).toEqual(['pc'])
    expect(noDeviceBypassesRouter()(home())).toEqual([])
  })

  it('everyDeviceHasIp ignores the internet cloud', () => {
    const plan = home()
    for (const d of plan.devices) if (d.type !== 'internet') d.ip = '192.168.1.' + d.id.length
    expect(everyDeviceHasIp()(plan)).toEqual([])
  })

  it('ipsInSameNetwork flags the odd one out', () => {
    const plan = build(
      [['pc', 'a', '192.168.1.10'], ['pc', 'b', '192.168.1.11'], ['pc', 'c', '10.0.0.5']],
      [],
    )
    const [f] = ipsInSameNetwork()(plan)
    expect(f?.deviceIds).toEqual(['c'])
    expect(f?.why).toContain('192.168.1')
  })
})

describe('whyCannotLink', () => {
  const plan = build(
    [['router', 'r'], ['smartphone', 'p'], ['switch', 'sw'], ['nas', 'n']],
    [],
  )
  const dev = (id: string) => plan.devices.find((d) => d.id === id)!

  it('explains a cable to a wireless-only device', () => {
    expect(whyCannotLink(plan, dev('r'), dev('p'), 'cable')).toMatch(/WLAN/)
  })

  it('rejects two devices with no medium in common', () => {
    expect(whyCannotLink(plan, dev('p'), dev('n'), 'wifi')).toMatch(/keine gemeinsame/)
  })

  it('allows a valid link', () => {
    expect(whyCannotLink(plan, dev('r'), dev('sw'), 'cable')).toBeNull()
    expect(whyCannotLink(plan, dev('r'), dev('p'), 'wifi')).toBeNull()
  })

  it('refuses a duplicate link', () => {
    const linked = build([['router', 'r'], ['pc', 'a']], [['r', 'a', 'cable']])
    const [r, a] = linked.devices
    expect(whyCannotLink(linked, r!, a!, 'cable')).toMatch(/schon verbunden/)
  })
})

describe('topology', () => {
  const plan = build(
    [['router', 'r'], ['switch', 'sw'], ['pc', 'pc'], ['tv', 'tv']],
    [['r', 'sw', 'cable'], ['sw', 'pc', 'cable']],
  )

  it('walks the graph', () => {
    expect([...reachableFrom(plan, 'r')].sort()).toEqual(['pc', 'r', 'sw'])
    expect(pathBetween(plan, 'r', 'pc')).toEqual(['r', 'sw', 'pc'])
    expect(pathBetween(plan, 'r', 'tv')).toBeNull()
  })

  it('knows what shares a medium', () => {
    const dev = (id: string) => plan.devices.find((d) => d.id === id)!
    expect(sharedMedia(dev('r'), dev('sw'))).toEqual(['cable'])
    expect(areLinked(plan, 'r', 'sw')).toBe(true)
    expect(areLinked(plan, 'r', 'pc')).toBe(false)
  })
})

describe('evaluateTask', () => {
  const taskRules = [requireCount('router', 1), requireCount('pc', 2), allConnectedTo('router')]

  it('passes a plan that satisfies both the task and the general rules', () => {
    const plan = build(
      [['router', 'r', '192.168.1.1'], ['pc', 'a', '192.168.1.20'], ['pc', 'b', '192.168.1.21']],
      [['r', 'a', 'cable'], ['r', 'b', 'cable']],
    )
    expect(evaluateTask(plan, taskRules)).toEqual([])
    expect(isTaskSolved(plan, taskRules)).toBe(true)
  })

  it('blocks completion on a general fault the task never mentioned', () => {
    // Task only asks for a router and two PCs — but both PCs share an address.
    const plan = build(
      [['router', 'r', '192.168.1.1'], ['pc', 'a', '192.168.1.20'], ['pc', 'b', '192.168.1.20']],
      [['r', 'a', 'cable'], ['r', 'b', 'cable']],
    )
    expect(taskRules.flatMap((r) => r(plan))).toEqual([])
    expect(codes(evaluateTask(plan, taskRules))).toContain('DUPLICATE_IP')
    expect(isTaskSolved(plan, taskRules)).toBe(false)
  })

  it('an empty canvas is never solved', () => {
    expect(isTaskSolved({ devices: [], links: [] }, [])).toBe(false)
  })
})

describe('lesson content stays in step with the rules', () => {
  it('every M2 goal is backed by at least one rule', async () => {
    const { m2Netzwerk } = await import('../lessons/m2-netzwerk')
    for (const task of m2Netzwerk.tasks) {
      expect(task.ziele.length).toBeGreaterThan(0)
      for (const ziel of task.ziele) {
        expect(ziel.text.length).toBeGreaterThan(0)
        expect(ziel.rules.length).toBeGreaterThan(0)
      }
    }
  })

  it('an empty canvas leaves every goal of every task unticked', async () => {
    // Most rules are vacuously true with no devices — "no address is
    // duplicated" holds trivially. The checklist must not tick on that.
    const { m2Netzwerk } = await import('../lessons/m2-netzwerk')
    const { zielMet } = await import('./types')
    const empty = { devices: [], links: [] }
    for (const task of m2Netzwerk.tasks) {
      const ticked = task.ziele.filter((z) => zielMet(empty, z))
      expect(ticked.map((z) => z.text)).toEqual([])
    }
  })

  it('ticks a goal once the plan actually satisfies it', async () => {
    const { m2Netzwerk } = await import('../lessons/m2-netzwerk')
    const { zielMet } = await import('./types')
    const lan = m2Netzwerk.tasks[0]!
    const plan = build(
      [['router', 'r'], ['switch', 'sw'], ['pc', 'a'], ['pc', 'b'], ['pc', 'c']],
      [['r', 'sw', 'cable'], ['sw', 'a', 'cable'], ['sw', 'b', 'cable'], ['sw', 'c', 'cable']],
    )
    expect(lan.ziele.every((z) => zielMet(plan, z))).toBe(true)
  })

  it('the addressing task ticks its duplicate goal off the shared rule', () => {
    const dup = build(
      [['pc', 'a', '192.168.1.5'], ['pc', 'b', '192.168.1.5']],
      [],
    )
    expect(noDuplicateIps(dup)[0]?.code).toBe('DUPLICATE_IP')
    expect(noDuplicateIps({ devices: [], links: [] })).toEqual([])
  })
})
