import { useEffect, useRef } from 'react'

/**
 * A few seconds of confetti over the whole screen, then gone. Drawn on a
 * canvas by hand — no library, no asset, nothing fetched. Colours are the
 * trainer's own tokens, so it looks right in both themes.
 */
export function Confetti({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = (canvas.width = window.innerWidth * dpr)
    const h = (canvas.height = window.innerHeight * dpr)
    const styles = getComputedStyle(document.documentElement)
    const colours = ['--brand', '--accent', '--good-bright', '--bad'].map((t) =>
      styles.getPropertyValue(t).trim(),
    )

    const pieces = Array.from({ length: 160 }, () => ({
      x: Math.random() * w,
      y: -Math.random() * h * 0.3,
      vx: (Math.random() - 0.5) * 2 * dpr,
      vy: (2 + Math.random() * 3) * dpr,
      size: (5 + Math.random() * 6) * dpr,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.25,
      colour: colours[Math.floor(Math.random() * colours.length)]!,
    }))

    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = (now - start) / 1000
      ctx.clearRect(0, 0, w, h)
      for (const p of pieces) {
        p.x += p.vx
        p.y += p.vy
        p.angle += p.spin
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = p.colour
        ctx.globalAlpha = t > 3 ? Math.max(0, 1 - (t - 3)) : 1
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }
      if (t < 4) frame = requestAnimationFrame(tick)
      else onDone()
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [onDone])

  return <canvas ref={ref} className="confetti" aria-hidden="true" />
}
