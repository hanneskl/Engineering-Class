import type { DeviceType } from '../model/plan'

/**
 * Real photographs of the devices, if any have been added.
 *
 * Drop a file named after the device type into `src/fotos/` — `router.jpg`,
 * `switch.png`, `nas.webp` — and it replaces the drawing everywhere the
 * picture is shown. Nothing else has to change: the list is read at build
 * time, so a missing photo costs no request and breaks nothing.
 *
 * See src/fotos/README.md for which device belongs in which file and what may
 * legally be used.
 */
const dateien = import.meta.glob('../fotos/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const NACH_TYP = new Map<string, string>(
  Object.entries(dateien).map(([pfad, url]) => [
    pfad
      .replace(/^.*\//, '')
      .replace(/\.[^.]+$/, '')
      .toLowerCase(),
    url,
  ]),
)

export function fotoFuer(type: DeviceType): string | undefined {
  return NACH_TYP.get(type)
}

/** Are there any photos at all? Drives whether the credits block is shown. */
export function fotosVorhanden(): boolean {
  return NACH_TYP.size > 0
}
