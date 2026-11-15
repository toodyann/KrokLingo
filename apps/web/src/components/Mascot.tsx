import cheer from '../assets/mascot-cheer.webp'
import thumb from '../assets/mascot-thumb.webp'

// The official KrokLingo mascot: the smiling tooth. Two poses, used as supplied (only trimmed and resized).
const POSES = {
  /** one thumb up, winking — greetings and empty states */
  thumb: { src: thumb, w: 520, h: 490 },
  /** both thumbs up — achievements and progress */
  cheer: { src: cheer, w: 520, h: 443 },
} as const

export type MascotPose = keyof typeof POSES

/** Decorative: the surrounding text carries the meaning, so the image has no alt text. */
export function Mascot({
  pose = 'thumb',
  size = 160,
  className = '',
}: {
  pose?: MascotPose
  size?: number
  className?: string
}) {
  const p = POSES[pose]
  return (
    <img
      src={p.src}
      alt=""
      width={size}
      height={Math.round((size * p.h) / p.w)}
      className={`mascot ${className}`.trim()}
      decoding="async"
      draggable={false}
    />
  )
}
