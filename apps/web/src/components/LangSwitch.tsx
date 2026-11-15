import type { Lang } from '../types'
import { useApp } from '../store/context'
import { Segmented } from './Segmented'

const LABELS: Record<Lang, string> = { en: 'English', uk: 'Українська' }

/** Question language for tests, the exam and training; hidden while the bank has only one. */
export function LangSwitch() {
  const { bank, updateSettings } = useApp()
  if (bank.langs.length < 2) return null
  return (
    <Segmented
      value={bank.lang}
      onChange={(questionLang) => updateSettings({ questionLang })}
      options={bank.langs.map(({ lang }) => [lang, LABELS[lang]] as const)}
      label="Мова питань"
    />
  )
}
