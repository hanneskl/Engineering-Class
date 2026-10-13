/**
 * A short rising fanfare, synthesised on the spot with the Web Audio API —
 * no sound file to ship or fetch. Fails silently on browsers that refuse
 * audio without a gesture; the confetti still shows.
 */
export function playFanfare(): void {
  try {
    const ctx = new AudioContext()
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    const t0 = ctx.currentTime
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const start = t0 + i * 0.14
      const stop = start + (i === notes.length - 1 ? 0.7 : 0.18)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, stop)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(stop)
    })
    setTimeout(() => void ctx.close(), 1500)
  } catch {
    // No audio — fine.
  }
}
