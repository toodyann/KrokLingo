import { useMemo } from 'react'
import { useMediaQuery } from '../lib/hooks'

export interface ChartTheme {
  series: string
  grid: string
  label2: string
  surface: string
  reducedMotion: boolean
}

const read = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

/**
 * Recharts writes colours into SVG attributes, where CSS variables don't resolve,
 * so the design tokens are read here and refreshed when the appearance changes.
 */
export function useChartTheme(): ChartTheme {
  const dark = useMediaQuery('(prefers-color-scheme: dark)')
  const contrast = useMediaQuery('(prefers-contrast: more)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  return useMemo(
    () => ({
      series: read('--chart-series', '#0066cc'),
      grid: read('--chart-grid', '#e5e5ea'),
      label2: read('--text-2', '#5b6170'),
      surface: read('--surface-1', '#ffffff'),
      reducedMotion,
    }),
    // re-read tokens whenever an appearance preference flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dark, contrast, reducedMotion],
  )
}
