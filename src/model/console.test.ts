import { describe, expect, it } from 'vitest'
import { HOP_MS, emptySession, run, terminals, type Session } from './console'
import { m5Befehle } from '../lessons/m5-befehle'
import {
  comparedTwoPings,
  evaluateConsole,
  isConsoleSolved,
  pingedInternet,
  pingedType,
  ranCommand,
  tracedHops,
} from './consoleRules'

const plan = m5Befehle.starter
const at = (name: string): Session => ({
  ...emptySession(),
  atDeviceId: plan.devices.find((d) => d.name === name)!.id,
})

/** Runs a script of commands and returns the finished session. */
function script(session: Session, ...cmds: string[]): Session {
  return cmds.reduce(
    (s, cmd) => ({ ...s, entries: [...s.entries, run(plan, s, cmd)] }),
    session,
  )
}

const out = (s: Session) => s.entries.at(-1)!

describe('ipconfig', () => {
  it('reports the machine you are sitting at and its gateway', () => {
    const e = out(script(at('PC'), 'ipconfig'))
    expect(e.ok).toBe(true)
    expect(e.lines.join('\n')).toContain('192.168.178.20')
    expect(e.lines.join('\n')).toContain('Standardgateway . . . . . . . . . : 192.168.178.1')
  })

  it('explains an address that is missing instead of printing a blank', () => {
    const noIp = { ...plan, devices: plan.devices.map((d) => ({ ...d, ip: undefined })) }
    const s = { ...at('PC') }
    const e = run(noIp, s, 'ipconfig')
    expect(e.ok).toBe(false)
    expect(e.lines.join(' ')).toMatch(/keine IP-Adresse/)
    expect(e.lines.join(' ')).toMatch(/DHCP/)
  })
})

describe('ping times come from the diagram', () => {
  it('cable beats wifi beats repeater', () => {
    const cable = out(script(at('PC'), 'ping Router')).ms!
    const wifi = out(script(at('Laptop'), 'ping Router')).ms!
    const repeated = out(script(at('Konsole'), 'ping Router')).ms!
    expect(cable).toBeLessThan(wifi)
    expect(wifi).toBeLessThan(repeated)
    // PC → Router is one cable hop.
    expect(cable).toBeLessThanOrEqual(HOP_MS.cable + 1)
  })

  it('the internet is the slowest thing there is', () => {
    // The ordering is the lesson: cable < wifi < repeater < internet. A device
    // in the flat must never look further away than a server abroad.
    const cable = out(script(at('PC'), 'ping Router')).ms!
    const wifi = out(script(at('PC'), 'ping Laptop')).ms!
    const repeated = out(script(at('PC'), 'ping Konsole')).ms!
    const far = out(script(at('PC'), 'ping google.com')).ms!
    expect([cable, wifi, repeated, far]).toEqual(
      [cable, wifi, repeated, far].sort((a, b) => a - b),
    )
    expect(far).toBeGreaterThan(repeated)
  })

  it('is stable: the same command twice gives the same average', () => {
    expect(out(script(at('PC'), 'ping Router')).ms).toBe(out(script(at('PC'), 'ping Router')).ms)
  })

  it('accepts an IP address as well as a name', () => {
    expect(out(script(at('PC'), 'ping 192.168.178.1')).ok).toBe(true)
  })

  it('says so when the host is unknown', () => {
    const e = out(script(at('PC'), 'ping fritzbox'))
    expect(e.ok).toBe(false)
    expect(e.lines[0]).toMatch(/konnte Host "fritzbox" nicht finden/)
  })

  it('refuses the internet when the plan has no uplink', () => {
    const offline = {
      devices: plan.devices.filter((d) => !['internet', 'modem'].includes(d.type)),
      links: plan.links.filter((l) => !l.id.match(/l1|l2/)),
    }
    const e = run(offline, at('PC'), 'ping google.com')
    expect(e.ok).toBe(false)
    expect(e.lines.join(' ')).toMatch(/keine Verbindung ins Internet/)
  })
})

describe('arp -a', () => {
  it('lists the neighbours but not the internet cloud', () => {
    const e = out(script(at('PC'), 'arp -a'))
    expect(e.ok).toBe(true)
    const named = e.lines.map((l) => l.match(/\(([^)]+)\)$/)?.[1]).filter(Boolean)
    expect(named).toContain('Router')
    expect(named).toContain('Konsole')
    // The cloud is not a machine, and a modem carries no address of its own.
    expect(named).not.toContain('Internet')
    expect(named).not.toContain('Modem')
  })
})

describe('tracert', () => {
  it('walks out through the router to the server', () => {
    const e = out(script(at('PC'), 'tracert google.com'))
    expect(e.ok).toBe(true)
    expect(e.hops).toBeGreaterThanOrEqual(4)
    const text = e.lines.join('\n')
    expect(text).toContain('Router')
    expect(text).toContain('google.com')
    expect(text).toContain('Ablaufverfolgung beendet.')
  })

  it('times rise along the route', () => {
    const rows = out(script(at('PC'), 'tracert google.com')).lines.filter((l) => /\d+ ms/.test(l))
    const times = rows.map((r) => Number(r.match(/(\d+) ms/)![1]))
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })
})

describe('unknown input', () => {
  it('suggests the help command', () => {
    const e = out(script(at('PC'), 'ifconfig'))
    expect(e.ok).toBe(false)
    expect(e.lines.join(' ')).toMatch(/hilfe/)
  })

  it('asks the student to pick a machine before anything else', () => {
    const e = run(plan, emptySession(), 'ipconfig')
    expect(e.ok).toBe(false)
    expect(e.lines[0]).toMatch(/keinem Gerät/)
  })
})

describe('task rules watch what was actually run', () => {
  const rules = m5Befehle.tasks.flatMap((t) => t.ziele.flatMap((z) => z.rules))

  it('nothing is satisfied by an untouched session', () => {
    const findings = evaluateConsole({ plan, session: at('PC') }, rules)
    expect(findings.length).toBe(rules.length)
  })

  it('the first task passes once both commands have run', () => {
    const task = m5Befehle.tasks[0]!
    const session = script(at('PC'), 'ipconfig', 'arp -a')
    expect(isConsoleSolved({ plan, session }, task.ziele.flatMap((z) => z.rules))).toBe(true)
  })

  it('comparing two similar pings is not enough', () => {
    const similar = script(at('PC'), 'ping Router', 'ping 192.168.178.2')
    expect(comparedTwoPings()({ plan, session: similar })).toHaveLength(1)
    const different = script(at('PC'), 'ping Router', 'ping Konsole')
    expect(comparedTwoPings()({ plan, session: different })).toEqual([])
  })

  it('checks the ping actually reached a router', () => {
    expect(pingedType('router', 'x')({ plan, session: script(at('PC'), 'ping Laptop') })).toHaveLength(1)
    expect(pingedType('router', 'x')({ plan, session: script(at('PC'), 'ping Router') })).toEqual([])
  })

  it('a failed command does not count as having run it', () => {
    const failed = script(at('PC'), 'ping nirgendwo')
    expect(ranCommand('ping', 'ping', 'x')({ plan, session: failed })).toHaveLength(1)
  })

  it('internet and hop-count goals need the real thing', () => {
    const s = script(at('PC'), 'ping google.com', 'tracert google.com')
    expect(pingedInternet()({ plan, session: s })).toEqual([])
    expect(tracedHops(4)({ plan, session: s })).toEqual([])
    expect(tracedHops(99)({ plan, session: s })).toHaveLength(1)
  })
})

describe('terminals', () => {
  it('offers only machines a student could sit at', () => {
    expect(terminals(plan).map((d) => d.name)).toEqual(['PC', 'Laptop'])
  })
})
