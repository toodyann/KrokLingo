import { useRef, useState, type ChangeEvent } from 'react'
import { IMPORT_TEMPLATE, parseImport } from '../lib/importQuestions'
import { clearAll } from '../lib/storage'
import { downloadFile, pluralUk } from '../lib/util'
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
  const { settings, updateSettings, customBank, setCustomBank } = app
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
    <div className="page page-narrow">
      <PageHeader title="Налаштування" />

      {message && (
        <div className={`banner${message.kind === 'bad' ? ' banner-warn' : ''}`} role="status">
          <span className="list-row-main">{message.text}</span>
          <button type="button" className="icon-btn" onClick={() => setMessage(null)} aria-label="Закрити повідомлення">
            <IconClose size={16} />
          </button>
        </div>
      )}

      <section className="section">
        <h2 className="section-title">Іспит</h2>
        <div className="list">
          <label className="list-row">
            <div className="list-row-main">Прохідний поріг, %</div>
            <input
              type="number"
              inputMode="decimal"
              className="num-input"
              min={1}
              max={100}
              step={0.5}
              value={settings.threshold}
              onChange={num('threshold', 1, 100)}
            />
          </label>
          <label className="list-row">
            <div className="list-row-main">Кількість завдань</div>
            <input
              type="number"
              inputMode="numeric"
              className="num-input"
              min={5}
              max={200}
              value={settings.examQuestions}
              onChange={num('examQuestions', 5, 200)}
            />
          </label>
          <label className="list-row">
            <div className="list-row-main">Час, хвилин</div>
            <input
              type="number"
              inputMode="numeric"
              className="num-input"
              min={5}
              max={300}
              value={settings.examMinutes}
              onChange={num('examMinutes', 5, 300)}
            />
          </label>
          <button
            type="button"
            className="list-row"
            style={{ color: 'var(--accent)' }}
            onClick={() =>
              updateSettings({
                threshold: DEFAULT_SETTINGS.threshold,
                examQuestions: DEFAULT_SETTINGS.examQuestions,
                examMinutes: DEFAULT_SETTINGS.examMinutes,
              })
            }
          >
            Відновити стандарт
          </button>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Переклад</h2>
        <div className="list">
          <label className="list-row" style={{ cursor: 'pointer' }}>
            <div className="list-row-main">Онлайн-переклад рідкісних слів</div>
            <input
              type="checkbox"
              className="switch"
              checked={settings.onlineTranslate}
              onChange={(e) => updateSettings({ onlineTranslate: e.target.checked })}
            />
          </label>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Збірники питань</h2>
        <div className="list">
          {customBank.collections.map((c) => {
            const n = customBank.questions.filter((q) => q.collection === c.id).length
            return (
              <div key={c.id} className="list-row">
                <div className="list-row-main">
                  {c.name}
                  <div className="secondary t-footnote">
                    {n} {pluralUk(n, 'питання', 'питання', 'питань')} · імпортовано
                  </div>
                </div>
                <button type="button" className="btn btn-destructive btn-sm" onClick={() => removeCollection(c.id, c.name)}>
                  Видалити
                </button>
              </div>
            )
          })}
          <button type="button" className="list-row" style={{ color: 'var(--accent)' }} onClick={() => importRef.current?.click()}>
            Імпортувати збірник (JSON)…
          </button>
          <button
            type="button"
            className="list-row"
            style={{ color: 'var(--accent)' }}
            onClick={() => downloadFile('kroklingo-shablon.json', JSON.stringify(IMPORT_TEMPLATE, null, 2), 'application/json')}
          >
            Завантажити шаблон
          </button>
        </div>
        <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={onImport} />
      </section>

      <section className="section">
        <h2 className="section-title">Дані</h2>
        <div className="list">
          <button type="button" className="list-row" style={{ color: 'var(--accent)' }} onClick={backup}>
            Зберегти резервну копію
          </button>
          <button type="button" className="list-row" style={{ color: 'var(--accent)' }} onClick={() => restoreRef.current?.click()}>
            Відновити з копії…
          </button>
          <button type="button" className="list-row" style={{ color: 'var(--danger)' }} onClick={reset}>
            Видалити всі дані
          </button>
        </div>
        <input ref={restoreRef} type="file" accept=".json,application/json" hidden onChange={restore} />
      </section>
    </div>
  )
}
