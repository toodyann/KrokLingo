import { useId } from 'react'

// Vector redraw of the KrokLingo tooth icon (same geometry as public/favicon.svg).
const TOOTH =
  'M627,288 C580,288 500,224 405,224 C290,224 192,320 192,450 C192,560 265,660 295,750 C318,840 340,990 390,1045 C420,1078 480,1075 500,1000 C520,920 560,780 627,780 C690,780 720,920 738,1000 C758,1075 818,1078 848,1045 C898,990 922,840 947,750 C977,660 1055,560 1055,450 C1055,320 964,224 849,224 C754,224 674,288 627,288 Z'
const HIGHLIGHT =
  'M276,524 C269,465 284,392 330,353 C360,330 405,314 450,314 C500,314 585,352 640,351 C605,362 540,358 480,356 C430,358 385,377 345,404 C310,430 283,475 276,524 Z'

export function BrandMark({ size = 32 }: { size?: number }) {
  const id = useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="150 170 954 954"
      aria-hidden="true"
      focusable="false"
      className="brand-mark"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0473D6" />
          <stop offset="1" stopColor="#0058B6" />
        </linearGradient>
      </defs>
      <path d={TOOTH} fill="#FDFDFC" stroke={`url(#${id})`} strokeWidth={58} strokeLinejoin="round" />
      <path d={HIGHLIGHT} fill="#68C1FC" />
    </svg>
  )
}
