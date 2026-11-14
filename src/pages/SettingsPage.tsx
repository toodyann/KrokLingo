import { useRef, useState, type ChangeEvent } from 'react'
import { IMPORT_TEMPLATE, parseImport } from '../lib/importQuestions'
import { clearAll } from '../lib/storage'
import { downloadFile, pluralUk } from '../lib/util'
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
    if (!confirm(`Видалити збірник «${name}» з усіма його питаннями?`)) return
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
      <h1>Налаштування</h1>

      {message && (
        <div className={`banner${message.kind === 'bad' ? ' banner-warn' : ''}`}>
          <span>{message.text}</span>
          <span className="spacer" />
          <button type="button" className="icon-btn" onClick={() => setMessage(null)} aria-label="Закрити">
            ×
          </button>
        </div>
      )}

      <div className="stack">
        <section className="card stack">
          <h2>Іспит</h2>
          <div className="grid grid-4">
            <label className="field">
              <span>Прохідний поріг, %</span>
              <input type="number" min={1} max={100} step={0.5} value={settings.threshold} onChange={num('threshold', 1, 100)} />
            </label>
            <label className="field">
              <span>Кількість завдань</span>
              <input type="number" min={5} max={200} value={settings.examQuestions} onChange={num('examQuestions', 5, 200)} />
            </label>
            <label className="field">
              <span>Час, хвилин</span>
              <input type="number" min={5} max={300} value={settings.examMinutes} onChange={num('examMinutes', 5, 300)} />
            </label>
          </div>
          <div className="row">
            <span className="muted small">
              Стандарт для англійської мови професійного спрямування: 50 завдань, 100 хвилин, поріг 40%.
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                updateSettings({
                  threshold: DEFAULT_SETTINGS.threshold,
                  examQuestions: DEFAULT_SETTINGS.examQuestions,
                  examMinutes: DEFAULT_SETTINGS.examMinutes,
                })
              }
            >
              Скинути до стандарту
            </button>
          </div>
        </section>

        <section className="card stack">
          <h2>Переклад</h2>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.onlineTranslate}
              onChange={(e) => updateSettings({ onlineTranslate: e.target.checked })}
            />
            <span>
              <b>Онлайн-переклад для слів поза вбудованим словником</b>
              <br />
              <span className="muted small">
                Усі слова вбудованої бази перекладаються миттєво й офлайн. Для слів з імпортованих збірників, яких немає
                у вбудованому словнику, слово надсилається до безкоштовного сервісу MyMemory.
              </span>
            </span>
          </label>
        </section>

        <section className="card stack">
          <h2>Імпорт питань</h2>
          <p className="muted" style={{ margin: 0 }}>
            Додайте власні збірники у форматі JSON — наприклад, питання з офіційних буклетів. Вони з’являться як окремі
            збірники в тренуванні та потраплятимуть в іспит.
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => importRef.current?.click()}>
              Імпортувати JSON
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                downloadFile('kroklingo-shablon.json', JSON.stringify(IMPORT_TEMPLATE, null, 2), 'application/json')
              }
            >
              Завантажити шаблон
            </button>
            <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={onImport} />
          </div>
          {customBank.collections.length > 0 && (
            <div>
              {customBank.collections.map((c) => {
                const n = customBank.questions.filter((q) => q.collection === c.id).length
                return (
                  <div key={c.id} className="row" style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                    <b>{c.name}</b>
                    <span className="muted small">
                      {n} {pluralUk(n, 'питання', 'питання', 'питань')}
                    </span>
                    <span className="spacer" />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeCollection(c.id, c.name)}>
                      Видалити
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <span className="muted small">Усього в базі зараз: {bank.questions.length} питань.</span>
        </section>

        <section className="card stack">
          <h2>Резервна копія</h2>
          <p className="muted" style={{ margin: 0 }}>
            Дані зберігаються лише в цьому браузері. Збережіть копію, щоб перенести прогрес і словник на інший пристрій.
          </p>
          <div className="row">
            <button type="button" className="btn btn-secondary btn-sm" onClick={backup}>
              Зберегти копію
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => restoreRef.current?.click()}>
              Відновити з копії
            </button>
            <input ref={restoreRef} type="file" accept=".json,application/json" hidden onChange={restore} />
            <span className="spacer" />
            <button type="button" className="btn btn-danger btn-sm" onClick={reset}>
              Видалити всі дані
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
