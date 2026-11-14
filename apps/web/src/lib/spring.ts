// Tiny spring animator in Apple's terms: damping ratio + response (seconds).
// Always starts from the current (presentation) value and accepts an initial
// velocity, so gestures can hand off smoothly and animations stay interruptible.

export interface SpringOptions {
  /** 1 = critically damped (no overshoot), < 1 = bouncy. */
  damping?: number
  /** Roughly how quickly the value reaches the target, in seconds. */
  response?: number
  /** Initial velocity in units per second. */
  velocity?: number
  onUpdate: (value: number, velocity: number) => void
  onComplete?: () => void
}

export interface SpringHandle {
  stop: () => void
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function animateSpring(from: number, to: number, opts: SpringOptions): SpringHandle {
  const damping = opts.damping ?? 1
  const response = opts.response ?? 0.35
  const omega = (2 * Math.PI) / response
  const x0 = from - to
  const v0 = opts.velocity ?? 0
  let raf = 0
  let stopped = false

  if (prefersReducedMotion()) {
    opts.onUpdate(to, 0)
    opts.onComplete?.()
    return { stop: () => {} }
  }

  const state = (t: number): [number, number] => {
    if (damping >= 1) {
      const e = Math.exp(-omega * t)
      const b = v0 + omega * x0
      return [to + (x0 + b * t) * e, (b - omega * (x0 + b * t)) * e]
    }
    const wd = omega * Math.sqrt(1 - damping * damping)
    const e = Math.exp(-damping * omega * t)
    const a = x0
    const b = (v0 + damping * omega * x0) / wd
    const cos = Math.cos(wd * t)
    const sin = Math.sin(wd * t)
    const x = to + e * (a * cos + b * sin)
    const v = e * ((b * wd - damping * omega * a) * cos - (a * wd + damping * omega * b) * sin)
    return [x, v]
  }

  const start = performance.now()
  const tick = (now: number) => {
    if (stopped) return
    const [x, v] = state((now - start) / 1000)
    if (Math.abs(x - to) < 0.5 && Math.abs(v) < 5) {
      opts.onUpdate(to, 0)
      opts.onComplete?.()
      return
    }
    opts.onUpdate(x, v)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return {
    stop: () => {
      stopped = true
      cancelAnimationFrame(raf)
    },
  }
}

/** Apple's momentum projection: where a flick would come to rest. */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/** Progressive resistance past a boundary. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

/** Tracks recent pointer samples to compute release velocity (px/s). */
export class VelocityTracker {
  private samples: { t: number; y: number }[] = []

  add(y: number, t = performance.now()) {
    this.samples.push({ t, y })
    const cutoff = t - 100
    while (this.samples.length > 2 && this.samples[0].t < cutoff) this.samples.shift()
  }

  velocity(): number {
    const s = this.samples
    if (s.length < 2) return 0
    const first = s[0]
    const last = s[s.length - 1]
    const dt = (last.t - first.t) / 1000
    return dt > 0 ? (last.y - first.y) / dt : 0
  }

  reset() {
    this.samples = []
  }
}
