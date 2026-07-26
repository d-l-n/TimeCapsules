let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

/** Play a short ascending 'pop' for watched actions. */
export function playWatchSound() {
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    // Quick ascending two-note: 523Hz → 659Hz
    osc.frequency.setValueAtTime(523, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(659, ctx.currentTime + 0.06)

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // Audio not supported or blocked — silently ignore
  }
}

/** Play a short descending 'click' for unwatched actions. */
export function playUnwatchSound() {
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'triangle'
    // Descending: 440Hz → 330Hz
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(330, ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
  } catch {
    // Audio not supported or blocked — silently ignore
  }
}

/** Play a celebratory three-note ascending fanfare for series completion. */
export function playCelebrationSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    // C5, E5, G5 — major triad arpeggio
    const notes = [523.25, 659.25, 783.99]

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      const t = now + i * 0.1
      osc.frequency.setValueAtTime(freq, t)

      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)

      osc.start(t)
      osc.stop(t + 0.3)
    })
  } catch {
    // Audio not supported or blocked — silently ignore
  }
}
