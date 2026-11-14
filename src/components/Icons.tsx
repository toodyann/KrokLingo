import type { ReactNode, SVGProps } from 'react'

// One icon family: 24px grid, filled shapes for tab bar (platform prefers filled symbols),
// 1.8px strokes for inline controls.

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  )
}

export function IconTests(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fill="currentColor"
        d="M7 2.5h10A2.5 2.5 0 0 1 19.5 5v14a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 19V5A2.5 2.5 0 0 1 7 2.5Zm1.6 5.3a.9.9 0 1 0-1.3 1.3l1.2 1.2a.9.9 0 0 0 1.3 0l2.4-2.4a.9.9 0 1 0-1.3-1.3l-1.75 1.76-.55-.56Zm5.4.2a.9.9 0 0 0 0 1.8h2.5a.9.9 0 0 0 0-1.8H14Zm-5.4 6.3a.9.9 0 1 0-1.3 1.3l1.2 1.2a.9.9 0 0 0 1.3 0l2.4-2.4a.9.9 0 1 0-1.3-1.3l-1.75 1.76-.55-.56Zm5.4.2a.9.9 0 0 0 0 1.8h2.5a.9.9 0 0 0 0-1.8H14Z"
      />
    </Svg>
  )
}

export function IconBook(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fill="currentColor"
        d="M11.1 5.6C9.5 4.4 7.3 3.8 4.8 3.8c-.8 0-1.5.6-1.5 1.4v12.1c0 .8.7 1.4 1.5 1.4 2.3 0 4.3.6 5.8 1.7.2.1.5 0 .5-.3V5.6Zm1.8 0v14.5c0 .3.3.4.5.3 1.5-1.1 3.5-1.7 5.8-1.7.8 0 1.5-.6 1.5-1.4V5.2c0-.8-.7-1.4-1.5-1.4-2.5 0-4.7.6-6.3 1.8Z"
      />
    </Svg>
  )
}

export function IconChart(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fill="currentColor"
        d="M5 3.5c.8 0 1.5.7 1.5 1.5v13.5H19a1.5 1.5 0 0 1 0 3H5A1.5 1.5 0 0 1 3.5 20V5c0-.8.7-1.5 1.5-1.5Zm14.6 3.8a1.2 1.2 0 0 1 .1 1.7l-4.4 5a1.2 1.2 0 0 1-1.7.1l-2.3-2-2.6 3a1.2 1.2 0 1 1-1.8-1.6l3.4-3.9a1.2 1.2 0 0 1 1.7-.1l2.3 2 3.6-4.1a1.2 1.2 0 0 1 1.7-.1Z"
      />
    </Svg>
  )
}

export function IconGear(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.3 2.6c.2-.6.8-1.1 1.5-1.1h.4c.7 0 1.3.5 1.5 1.1l.4 1.6c.5.2 1 .4 1.4.7l1.5-.8c.6-.3 1.4-.2 1.9.3l.3.3c.5.5.6 1.3.3 1.9l-.8 1.5c.3.4.5.9.7 1.4l1.6.4c.6.2 1.1.8 1.1 1.5v.4c0 .7-.5 1.3-1.1 1.5l-1.6.4c-.2.5-.4 1-.7 1.4l.8 1.5c.3.6.2 1.4-.3 1.9l-.3.3c-.5.5-1.3.6-1.9.3l-1.5-.8c-.4.3-.9.5-1.4.7l-.4 1.6c-.2.6-.8 1.1-1.5 1.1h-.4c-.7 0-1.3-.5-1.5-1.1l-.4-1.6c-.5-.2-1-.4-1.4-.7l-1.5.8c-.6.3-1.4.2-1.9-.3l-.3-.3a1.6 1.6 0 0 1-.3-1.9l.8-1.5c-.3-.4-.5-.9-.7-1.4l-1.6-.4c-.6-.2-1.1-.8-1.1-1.5v-.4c0-.7.5-1.3 1.1-1.5l1.6-.4c.2-.5.4-1 .7-1.4l-.8-1.5a1.6 1.6 0 0 1 .3-1.9l.3-.3c.5-.5 1.3-.6 1.9-.3l1.5.8c.4-.3.9-.5 1.4-.7l.4-1.6ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      />
    </Svg>
  )
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 6.5l11 11m0-11l-11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  )
}

export function IconChevronLeft(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

export function IconChevronRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

export function IconGrid(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fill="currentColor"
        d="M5 4h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM5 14h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Zm10 0h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z"
      />
    </Svg>
  )
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

export function IconPencil(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M14.5 5.5l4 4M4.5 19.5l1-4.5L16 4.5a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L9 18.5l-4.5 1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

export function IconTrash(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2m-8 0 .8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}
