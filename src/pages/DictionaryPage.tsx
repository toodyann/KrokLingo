import { useMemo, useState, type FormEvent } from 'react'
import { IconCheck, IconPencil, IconTrash } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/toastContext'
import { exportDocx, exportTxt } from '../lib/exportDictionary'
import { formatDate, pluralUk } from '../lib/util'
import { useApp } from '../store/context'
import type { DictEntry } from '../types'

type Filter = 'all' | 'learning' | 'learned' | 'untranslated'
type Sort = 'new' | 'az' | 'lookups'

const FILTERS: [Filter, string][] = [
  ['all', 'Усі'],
  ['learning', 'Вивчаю'],
  ['learned', 'Вивчені'],
  ['untranslated', 'Без перекладу'],
]

export function DictionaryPage() {
  const { dictionary, addEntry, updateEntry, deleteEntries, restoreEntries } = useApp()
  const toast = useToast()
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

  const learned = dictionary.filter((e) => e.learned)
  const untranslated = dictionary.filter((e) => !e.translation).length

  const remove = (entries: DictEntry[], message: string) => {
    deleteEntries(entries.map((e) => e.id))
    toast({ message, onAction: () => restoreEntries(entries) })
  }

  return (
    <div className="page">
      <PageHeader
        title="Словник"
        subtitle={
          <>
            {dictionary.length} {pluralUk(dictionary.length, 'слово', 'слова', 'слів')} · вивчено {learned.length}
            {untranslated > 0 && ` · без перекладу ${untranslated}`}
          </>
        }
        actions={
          dictionary.length > 0 && (
            <a className="btn btn-primary btn-sm" href="#/flashcards">
              Повторити картками
            </a>
          )
        }
      />

      <div className="toolbar">
        <input
          type="search"
          placeholder="Пошук слова, перекладу чи примітки"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Пошук у словнику"
        />
        <div className="segmented" role="radiogroup" aria-label="Фільтр">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" role="radio" aria-checked={filter === key} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Сортування">
          <option value="new">Спочатку нові</option>
          <option value="az">За алфавітом</option>
          <option value="lookups">Найчастіше шукані</option>
        </select>
      </div>

      {adding && (
        <div className="card section">
          <EntryForm
            submitLabel="Додати слово"
            onCancel={() => setAdding(false)}
            onSubmit={(v) => {
              addEntry(v.word, v.translation, v.note)
              setAdding(false)
            }}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="card empty">
          {dictionary.length === 0 ? (
            <>
              <h2 className="t-title3">Словник порожній</h2>
            </>
          ) : (
            'Нічого не знайдено.'
          )}
        </div>
      ) : (
        <div className="list section">
          {visible.map((e) =>
            editingId === e.id ? (
              <div className="dict-entry" key={e.id}>
                <EntryForm
                  initial={e}
                  submitLabel="Зберегти"
                  onCancel={() => setEditingId(null)}
                  onSubmit={(v) => {
                    const translation = v.translation.trim()
                    updateEntry(e.id, {
                      word: v.word.trim().toLowerCase(),
                      translation,
                      note: v.note.trim(),
                      source: translation !== e.translation ? 'manual' : e.source,
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
                onToggleLearned={() => updateEntry(e.id, { learned: !e.learned, box: e.learned ? 0 : e.box })}
                onDelete={() => remove([e], `«${e.word}» видалено`)}
              />
            ),
          )}
        </div>
      )}

      <div className="row">
        <button type="button" className="btn btn-tinted btn-sm" onClick={() => setAdding((v) => !v)}>
          Додати слово
        </button>
        <button type="button" className="btn btn-plain btn-sm" onClick={() => exportTxt(visible)} disabled={!visible.length}>
          Експорт .txt
        </button>
        <button type="button" className="btn btn-plain btn-sm" onClick={() => exportDocx(visible)} disabled={!visible.length}>
          Експорт .docx
        </button>
        <span className="spacer" />
        {learned.length > 0 && (
          <button
            type="button"
            className="btn btn-destructive btn-sm"
            onClick={() =>
              remove(learned, `Видалено ${learned.length} ${pluralUk(learned.length, 'вивчене слово', 'вивчені слова', 'вивчених слів')}`)
            }
          >
            Видалити вивчені
          </button>
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
        <div className="dict-word">
          <mark>{entry.word}</mark>
        </div>
        <div className="secondary t-footnote" title={formatDate(entry.addedAt)}>
          {entry.learned ? 'вивчено' : entry.lookups > 1 ? `шукали ${entry.lookups} рази` : formatDate(entry.addedAt).split(',')[0]}
        </div>
      </div>
      <div className="dict-tr">
        {entry.translation ? <div>{entry.translation}</div> : <span className="pill pill-warning">без перекладу</span>}
        {entry.note && <div className="dict-note">{entry.note}</div>}
      </div>
      <div className="dict-actions">
        <button
          type="button"
          className={`icon-btn${entry.learned ? ' on' : ''}`}
          onClick={onToggleLearned}
          aria-pressed={entry.learned}
          aria-label={entry.learned ? `Повернути «${entry.word}» до вивчення` : `Позначити «${entry.word}» як вивчене`}
          title={entry.learned ? 'Повернути до вивчення' : 'Позначити як вивчене'}
        >
          <IconCheck />
        </button>
        <button type="button" className="icon-btn" onClick={onEdit} aria-label={`Редагувати «${entry.word}»`} title="Редагувати">
          <IconPencil />
        </button>
        <button type="button" className="icon-btn" onClick={onDelete} aria-label={`Видалити «${entry.word}»`} title="Видалити">
          <IconTrash />
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
    <form className="dict-edit" onSubmit={submit}>
      <label className="field">
        <span>Слово англійською</span>
        <input
          type="text"
          autoFocus
          autoCapitalize="none"
          spellCheck={false}
          value={values.word}
          onChange={(e) => setValues((v) => ({ ...v, word: e.target.value }))}
          required
        />
      </label>
      <label className="field">
        <span>Переклад</span>
        <input type="text" value={values.translation} onChange={(e) => setValues((v) => ({ ...v, translation: e.target.value }))} />
      </label>
      <label className="field full">
        <span>Примітка</span>
        <textarea
          rows={2}
          placeholder="Медичне значення терміна, приклад, асоціація"
          value={values.note}
          onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
        />
      </label>
      <div className="row full">
        <button type="submit" className="btn btn-primary btn-sm">
          {submitLabel}
        </button>
        <button type="button" className="btn btn-plain btn-sm" onClick={onCancel}>
          Скасувати
        </button>
      </div>
    </form>
  )
}
