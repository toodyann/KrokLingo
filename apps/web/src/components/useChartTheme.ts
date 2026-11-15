import { useMemo } from 'react'
import { useMediaQuery } from '../lib/hooks'

export interface ChartTheme {
  series: string
  grid: string
  label2: string
  surface: string
  /** Bright accents for single-series charts on the dashboard. */
  accent: { lime: string; purple: string; sky: string; coral: string; yellow: string; pink: string }
  reducedMotion: boolean
}

const read = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

/**
 * Recharts writes colours into SVG attributes, where CSS variables don't resolve,
 * so the design tokens are read here and refreshed when a display preference changes.
 */
export function useChartTheme(): ChartTheme {
  const contrast = useMediaQuery('(prefers-contrast: more)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  return useMemo(
    () => ({
      series: read('--chart-series', '#78d9f5'),
      grid: read('--chart-grid', 'rgb(255 255 255 / 0.07)'),
      label2: read('--text-2', '#b4bedb'),
      surface: read('--surface-1', '#14234a'),
      accent: {
        lime: read('--lime', '#b7f36b'),
        purple: read('--purple', '#a58bfa'),
        sky: read('--sky', '#78d9f5'),
        coral: read('--coral', '#ffad87'),
        yellow: read('--yellow', '#ffd36d'),
        pink: read('--pink', '#f4a8ce'),
      },
      reducedMotion,
    }),
    // re-read tokens whenever a display preference flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contrast, reducedMotion],
  )
}
