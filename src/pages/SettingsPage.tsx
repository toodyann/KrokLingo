import { useRef, useState, type ChangeEvent } from 'react'
import { IMPORT_TEMPLATE, parseImport } from '../lib/importQuestions'
import { clearAll } from '../lib/storage'
import { downloadFile, pluralUk } from '../lib/util'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { IconClose } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/toastContext'
import { useApp } from '../store/context'
import { DEFAULT_SETTINGS } from '../store/defaults'
import type { AttemptRecord, CustomBank, DictEntry, Settings } from '../types'

interface Backup {
  app: 'kroklingo'
  version: 1
  exportedAt: string
  settings: Settings
  dictionary: DictEntry[]
  history: AttemptRecord[]
  customBank: CustomBank
}

function readFile(file: File): Promise<string> {
  return file.text()
}

export function SettingsPage() {
  const app = useApp()
  const toast = useToast()
  const { settings, updateSettings, customBank, setCustomBank, bank } = app
  const [message, setMessage] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const restoreRef = useRef<HTMLInputElement>(null)

  const num = (key: keyof Settings, min: number, max: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (!Number.isNaN(v)) updateSettings({ [key]: Math.min(max, Math.max(min, v)) } as Partial<Settings>)
  }

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const result = parseImport(JSON.parse(await readFile(file)), file.name.replace(/\.json$/i, ''))
      if (result.questions.length === 0) {
        setMessage({ kind: 'bad', text: `Не імпортовано жодного питання. ${result.errors.slice(0, 5).join(' ')}` })
        return
      }
      setCustomBank({
        collections: [...customBank.collections, result.collection],
        questions: [...customBank.questions, ...result.questions],
        passages: [...customBank.passages, ...result.passages],
      })
      setMessage({
        kind: result.errors.length ? 'bad' : 'ok',
        text:
          `Імпортовано «${result.collection.name}»: ${result.questions.length} питань.` +
          (result.errors.length ? ` Пропущено ${result.errors.length}: ${result.errors.slice(0, 3).join(' ')}` : ''),
      })
    } catch (err) {
      setMessage({ kind: 'bad', text: `Помилка імпорту: ${err instanceof Error ? err.message : String(err)}` })
    }
  }

  const removeCollection = (id: string, name: string) => {
    const previous = customBank
    toast({ message: `Збірник «${name}» видалено`, onAction: () => setCustomBank(previous) })
    const remaining = customBank.questions.filter((q) => q.collection !== id)
    const usedPassages = new Set(remaining.map((q) => q.passageId))
    setCustomBank({
      collections: customBank.collections.filter((c) => c.id !== id),
      questions: remaining,
      passages: customBank.passages.filter((p) => usedPassages.has(p.id)),
    })
  }

  const backup = () => {
    const data: Backup = {
      app: 'kroklingo',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      dictionary: app.dictionary,
      history: app.history,
      customBank,
    }
    downloadFile(
      `kroklingo-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(data, null, 2),
      'application/json',
    )
  }

  const restore = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await readFile(file)) as Partial<Backup>
      if (data.app !== 'kroklingo') throw new Error('це не резервна копія KrokLingo')
      if (!confirm('Відновлення замінить поточний словник, історію та імпортовані збірники. Продовжити?')) return
      updateSettings({ ...DEFAULT_SETTINGS, ...data.settings })
      app.replaceDictionary(Array.isArray(data.dictionary) ? data.dictionary : [])
      app.replaceHistory(Array.isArray(data.history) ? data.history : [])
      setCustomBank(data.customBank ?? { collections: [], questions: [], passages: [] })
      setMessage({ kind: 'ok', text: 'Дані відновлено з резервної копії.' })
    } catch (err) {
      setMessage({ kind: 'bad', text: `Не вдалося відновити: ${err instanceof Error ? err.message : String(err)}` })
    }
  }

  const reset = () => {
    if (!confirm('Видалити ВСІ дані: історію, словник, імпортовані збірники та налаштування? Це не можна скасувати.')) return
    clearAll()
    location.reload()
  }

  return (
    <div className="page">
      <PageHeader title="Налаштування" />

      {message && (
        <Alert variant={message.kind === 'bad' ? 'destructive' : 'default'} className="mb-6 max-w-[1240px]" role="status">
          <AlertDescription>{message.text}</AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="icon-sm" onClick={() => setMessage(null)} aria-label="Закрити повідомлення">
              <IconClose size={16} />
            </Button>
          </AlertAction>
        </Alert>
      )}

      <div className="settings-grid">
        <div className="stack" style={{ gap: 'var(--gap)' }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Іспит</CardTitle>
              <CardDescription>Кількість завдань, час і прохідний поріг симуляції</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <NumberRow
                id="set-threshold"
                label="Прохідний поріг, %"
                value={settings.threshold}
                min={1}
                max={100}
                step={0.5}
                onChange={num('threshold', 1, 100)}
              />
              <NumberRow
                id="set-questions"
                label="Кількість завдань"
                value={settings.examQuestions}
                min={5}
                max={200}
                onChange={num('examQuestions', 5, 200)}
              />
              <NumberRow
                id="set-minutes"
                label="Час, хвилин"
                value={settings.examMinutes}
                min={5}
                max={300}
                onChange={num('examMinutes', 5, 300)}
              />
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                onClick={() =>
                  updateSettings({
                    threshold: DEFAULT_SETTINGS.threshold,
                    examQuestions: DEFAULT_SETTINGS.examQuestions,
                    examMinutes: DEFAULT_SETTINGS.examMinutes,
                  })
                }
              >
                Відновити стандарт
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Переклад</CardTitle>
              <CardDescription>Як перекладаються слова поза вбудованим словником</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="grid gap-1">
                  <Label htmlFor="set-online">Онлайн-переклад рідкісних слів</Label>
                  <p className="text-sm text-muted-foreground">Через безкоштовний сервіс MyMemory</p>
                </div>
                <Switch
                  id="set-online"
                  checked={settings.onlineTranslate}
                  onCheckedChange={(v) => updateSettings({ onlineTranslate: v })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="stack" style={{ gap: 'var(--gap)' }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Збірники питань</CardTitle>
              <CardDescription>Власні питання у форматі JSON · зараз у базі {bank.questions.length}</CardDescription>
            </CardHeader>
            {customBank.collections.length > 0 && (
              <CardContent className="grid gap-2">
                {customBank.collections.map((c) => {
                  const n = customBank.questions.filter((q) => q.collection === c.id).length
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                      <div className="min-w-0">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {n} {pluralUk(n, 'питання', 'питання', 'питань')}
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => removeCollection(c.id, c.name)}>
                        Видалити
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            )}
            <CardFooter className="flex flex-wrap gap-2">
              <Button onClick={() => importRef.current?.click()}>Імпортувати JSON</Button>
              <Button
                variant="outline"
                onClick={() => downloadFile('kroklingo-shablon.json', JSON.stringify(IMPORT_TEMPLATE, null, 2), 'application/json')}
              >
                Завантажити шаблон
              </Button>
            </CardFooter>
            <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={onImport} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Дані</CardTitle>
              <CardDescription>Історія, словник і збірники зберігаються лише в цьому браузері</CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={backup}>
                Зберегти резервну копію
              </Button>
              <Button variant="outline" onClick={() => restoreRef.current?.click()}>
                Відновити з копії
              </Button>
              <Button variant="destructive" onClick={reset}>
                Видалити всі дані
              </Button>
            </CardFooter>
            <input ref={restoreRef} type="file" accept=".json,application/json" hidden onChange={restore} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function NumberRow({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode={step ? 'decimal' : 'numeric'}
        className="w-28 text-right tabular-nums"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
