import { useCallback, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { animateSpring, project, rubberband, VelocityTracker, type SpringHandle } from '../lib/spring'

/**
 * Bottom-sheet physics in Apple's terms:
 * - enters and leaves along the same path (from/to the bottom edge);
 * - drag tracks the pointer 1:1 from where it was grabbed;
 * - past the top boundary it rubber-bands instead of stopping hard;
 * - on release, momentum is projected to choose dismiss vs. return, and the spring
 *   inherits the pointer's velocity (no seam between drag and animation);
 * - grabbing mid-flight stops the spring and continues from the on-screen value.
 */
export function useDraggableSheet(onDismissed: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const y = useRef(0)
  const spring = useRef<SpringHandle | null>(null)
  const drag = useRef<{ startY: number; pointerId: number; moved: boolean } | null>(null)
  const tracker = useRef(new VelocityTracker())

  const apply = (value: number) => {
    y.current = value
    if (ref.current) ref.current.style.transform = `translateY(${value}px)`
  }

  const height = () => (ref.current?.offsetHeight ?? 240) + 24

  const animateTo = useCallback((target: number, velocity: number, damping: number, done?: () => void) => {
    spring.current?.stop()
    spring.current = animateSpring(y.current, target, {
      damping,
      response: 0.32,
      velocity,
      onUpdate: (v) => apply(v),
      onComplete: done,
    })
  }, [])

  const dismiss = useCallback(
    (velocity = 0) => animateTo(height(), Math.max(velocity, 0), 1, onDismissed),
    [animateTo, onDismissed],
  )

  useLayoutEffect(() => {
    apply(height())
    animateTo(0, 0, 1)
    return () => spring.current?.stop()
  }, [animateTo])

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button, input, textarea, select, a, label, .ctext')) return
    // Don't steal the gesture from scrollable content that isn't at its top.
    if (ref.current && ref.current.scrollTop > 0) return
    spring.current?.stop()
    drag.current = { startY: e.clientY - y.current, pointerId: e.pointerId, moved: false }
    tracker.current.reset()
    tracker.current.add(e.clientY)
    // keep receiving moves even when the pointer leaves the sheet
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // pointer already released — the drag simply won't be captured
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const raw = e.clientY - d.startY
    if (!d.moved) {
      // hysteresis before committing to a drag
      if (Math.abs(raw - y.current) < 8) return
      d.moved = true
    }
    apply(raw < 0 ? rubberband(raw, height()) : raw)
    tracker.current.add(e.clientY)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    if (!d.moved) return
    const velocity = tracker.current.velocity()
    const projected = y.current + project(velocity)
    if (projected > height() * 0.5) dismiss(velocity)
    else animateTo(0, velocity, velocity < -300 ? 0.8 : 1)
  }

  return {
    ref,
    dismiss,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }
}
