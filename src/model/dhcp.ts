import { DEVICES, type Plan } from './plan'
import { reachableFrom } from './topology'
import { isValidIpv4 } from './rules'

/**
 * What the router really does: hand every device in the network an address.
 *
 * This is DHCP as the Lehrplan wants it understood — "Wer vergibt die
 * IP-Adressen? Der Router (DHCP)". Pressing the button in the inspector *is*
 * the lesson: the addresses appear, they are all in one network, and none of
 * them collide.
 */

export const DEFAULT_PREFIX = '192.168.178'

/** Router keeps .1; clients start here, the way a real home router does. */
const FIRST_HOST = 20

export function prefixOf(ip: string | undefined): string | null {
  if (!ip || !isValidIpv4(ip)) return null
  return ip.split('.').slice(0, 3).join('.')
}

export type DhcpResult = {
  plan: Plan
  /** How many devices were given an address. */
  assigned: number
  /** Null when the network has no router to hand them out. */
  prefix: string | null
}

/**
 * Assigns addresses from the router outwards, in the order devices are
 * reached, so the numbering follows the shape of the network rather than the
 * order the student happened to draw things in.
 */
export function assignAddresses(plan: Plan): DhcpResult {
  const router = plan.devices.find((d) => d.type === 'router')
  if (!router) return { plan, assigned: 0, prefix: null }

  // Keep the student's own choice of network if they already picked one.
  const prefix = prefixOf(router.ip) ?? DEFAULT_PREFIX

  const reachable = reachableFrom(plan, router.id)
  const order = plan.devices.filter(
    (d) => d.id !== router.id && reachable.has(d.id) && DEVICES[d.type].hasIp,
  )

  const addresses = new Map<string, string>([[router.id, `${prefix}.1`]])
  order.forEach((d, i) => addresses.set(d.id, `${prefix}.${FIRST_HOST + i}`))

  return {
    plan: {
      ...plan,
      devices: plan.devices.map((d) => {
        const ip = addresses.get(d.id)
        if (ip) return { ...d, ip }
        // A device the router cannot reach gets nothing — exactly what would
        // happen in reality, and the checklist will say so.
        return DEVICES[d.type].hasIp ? d : { ...d, ip: undefined }
      }),
    },
    assigned: addresses.size,
    prefix,
  }
}
