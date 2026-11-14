import { useMemo, useState, type FormEvent } from 'react'
import { exportDocx, exportTxt } from '../lib/exportDictionary'
import { formatDate, pluralUk } from '../lib/util'
import { useApp } from '../store/context'
import type { DictEntry } from '../types'

type Filter = 'all' | 'learning' | 'learned' | 'untranslated'
type Sort = 'new' | 'az' | 'lookups'

export function DictionaryPage() {
  const { dictionary, addEntry, updateEntry, deleteEntries } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('new')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = dictionary.filter((e) => {
      if (filter === 'learning' && e.learned) return false
      if (filter === 'learned' && !e.learned) return false
      if (filter === 'untranslated' && e.translation) return false
      if (!q) return true
      return [e.word, e.translation, e.note].some((s) => s.toLowerCase().includes(q))
    })
    return list.sort((a, b) =>
      sort === 'az' ? a.word.localeCompare(b.word) : sort === 'lookups' ? b.lookups - a.lookups : b.addedAt - a.addedAt,
    )
  }, [dictionary, query, filter, sort])

  const learnedCount = dictionary.filter((e) => e.learned).length
  const untranslated = dictionary.filter((e) => !e.translation).length

  const removeLearned = () => {
    if (learnedCount && confirm(`Видалити ${learnedCount} вивчених слів зі словника?`)) {
      deleteEntries(dictionary.filter((e) => e.learned).map((e) => e.id))
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Словник невідомих слів</h1>
          <span className="muted">
            {dictionary.length} {pluralUk(dictionary.length, 'слово', 'слова', 'слів')} · вивчено {learnedCount}
            {untranslated > 0 && ` · без перекладу ${untranslated}`}
          </span>
        </div>
        <div className="row">
          {dictionary.length > 0 && (
            <a className="btn btn-primary btn-sm" href="#/flashcards">
              Повторювати картками
            </a>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportTxt(visible)} disabled={!visible.length}>
            Експорт .txt
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportDocx(visible)} disabled={!visible.length}>
            Експорт .docx
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <input type="search" placeholder="Пошук слова, перекладу чи примітки…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Фільтр">
            <option value="all">Усі слова</option>
            <option value="learning">До вивчення</option>
            <option value="learned">Вивчені</option>
            <option value="untranslated">Без перекладу</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Сортування">
            <option value="new">Спочатку нові</option>
            <option value="az">За алфавітом</option>
            <option value="lookups">Найчастіше шукані</option>
          </select>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding((v) => !v)}>
            + Додати слово
          </button>
          {learnedCount > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={removeLearned}>
              Видалити вивчені
            </button>
          )}
        </div>

        {adding && (
          <EntryForm
            submitLabel="Додати"
            onCancel={() => setAdding(false)}
            onSubmit={(v) => {
              addEntry(v.word, v.translation, v.note)
              setAdding(false)
            }}
          />
        )}

        {visible.length === 0 ? (
          <div className="empty">
            {dictionary.length === 0
              ? 'Словник порожній. Натискайте на незнайомі англійські слова в тестах — вони з’являться тут разом із перекладом.'
              : 'Нічого не знайдено.'}
          </div>
        ) : (
          <div>
            {visible.map((e) =>
              editingId === e.id ? (
                <div className="dict-entry" key={e.id}>
                  <EntryForm
                    initial={e}
                    submitLabel="Зберегти"
                    onCancel={() => setEditingId(null)}
                    onSubmit={(v) => {
                      updateEntry(e.id, {
                        word: v.word.trim().toLowerCase(),
                        translation: v.translation.trim(),
                        note: v.note.trim(),
                        source: v.translation.trim() !== e.translation ? 'manual' : e.source,
                      })
                      setEditingId(null)
                    }}
                  />
                </div>
              ) : (
                <EntryRow
                  key={e.id}
                  entry={e}
                  onEdit={() => setEditingId(e.id)}
                  onToggleLearned={() => updateEntry(e.id, { learned: !e.learned })}
                  onDelete={() => deleteEntries([e.id])}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EntryRow({
  entry,
  onEdit,
  onToggleLearned,
  onDelete,
}: {
  entry: DictEntry
  onEdit: () => void
  onToggleLearned: () => void
  onDelete: () => void
}) {
  return (
    <div className={`dict-entry${entry.learned ? ' learned' : ''}`}>
      <div>
        <div className="dict-word">{entry.word}</div>
        <div className="muted small" title={formatDate(entry.addedAt)}>
          {entry.lookups > 1 ? `шукали ${entry.lookups} рази` : formatDate(entry.addedAt).split(',')[0]}
        </div>
      </div>
      <div className="dict-tr">
        {entry.translation ? <div>{entry.translation}</div> : <span className="badge badge-warn">без перекладу</span>}
        {entry.note && <div className="dict-note">{entry.note}</div>}
      </div>
      <div className="dict-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleLearned}
          title={entry.learned ? 'Повернути до вивчення' : 'Позначити як вивчене'}
          aria-label={entry.learned ? 'Повернути до вивчення' : 'Позначити як вивчене'}
          style={entry.learned ? { color: 'var(--ok)' } : undefined}
        >
          ✓
        </button>
        <button type="button" className="icon-btn" onClick={onEdit} title="Редагувати" aria-label="Редагувати">
          ✎
        </button>
        <button type="button" className="icon-btn" onClick={onDelete} title="Видалити" aria-label="Видалити">
          🗑
        </button>
      </div>
    </div>
  )
}

interface FormValues {
  word: string
  translation: string
  note: string
}

function EntryForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<FormValues>
  submitLabel: string
  onSubmit: (values: FormValues) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<FormValues>({
    word: initial?.word ?? '',
    translation: initial?.translation ?? '',
    note: initial?.note ?? '',
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (values.word.trim()) onSubmit(values)
  }
  return (
    <form className="dict-edit" onSubmit={submit} style={{ padding: '12px 0' }}>
      <label className="field">
        <span>Слово (англійською)</span>
        <input autoFocus value={values.word} onChange={(e) => setValues((v) => ({ ...v, word: e.target.value }))} required />
      </label>
      <label className="field">
        <span>Переклад</span>
        <input value={values.translation} onChange={(e) => setValues((v) => ({ ...v, translation: e.target.value }))} />
      </label>
      <label className="field full">
        <span>Примітка</span>
        <textarea
          rows={2}
          placeholder="Медичне значення терміна, приклад, асоціація…"
          value={values.note}
          onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
        />
      </label>
      <div className="row full">
        <button type="submit" className="btn btn-primary btn-sm">
          {submitLabel}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Скасувати
        </button>
      </div>
    </form>
  )
}
