import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Props<T extends string | number> {
  value: T
  onChange: (value: T) => void
  options: readonly (readonly [T, string])[]
  label: string
  className?: string
}

/** Single-choice filter (period, mode, direction…) built on shadcn Tabs. */
export function Segmented<T extends string | number>({ value, onChange, options, label, className }: Props<T>) {
  return (
    <Tabs
      value={String(value)}
      onValueChange={(v) => {
        const match = options.find(([key]) => String(key) === v)
        if (match) onChange(match[0])
      }}
      className={className}
    >
      <TabsList aria-label={label}>
        {options.map(([key, text]) => (
          <TabsTrigger key={String(key)} value={String(key)}>
            {text}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
