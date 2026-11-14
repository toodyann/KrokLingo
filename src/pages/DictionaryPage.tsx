import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Segmented } from '../components/Segmented'
import { EmptyState } from '../components/EmptyState'
import { IconBook, IconCheck, IconDownload, IconPencil, IconPlus, IconTrash } from '../components/Icons'
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
          dictionary.length > 0 ? (
            <>
              {dictionary.length} {pluralUk(dictionary.length, 'слово', 'слова', 'слів')} · вивчено {learned.length}
              {untranslated > 0 && ` · без перекладу ${untranslated}`}
            </>
          ) : undefined
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
              <IconPlus />
              Додати слово
            </Button>
            {dictionary.length > 0 && (
              <Button asChild>
                <a href="#/flashcards">Повторити картками</a>
              </Button>
            )}
          </>
        }
      />

      {adding && (
        <Card className="section">
          <CardHeader>
            <CardTitle className="text-base">Нове слово</CardTitle>
          </CardHeader>
          <CardContent>
          <EntryForm
            submitLabel="Додати слово"
            onCancel={() => setAdding(false)}
            onSubmit={(v) => {
              addEntry(v.word, v.translation, v.note)
              setAdding(false)
            }}
          />
          </CardContent>
        </Card>
      )}

      {dictionary.length === 0 ? (
        <EmptyState
          icon={<IconBook />}
          title="Словник порожній"
          actions={
            <Button asChild>
              <a href="#/tests">До тестів</a>
            </Button>
          }
        >
          Натисніть на незнайоме слово в будь-якому питанні — воно збережеться тут разом із перекладом.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <Input
              type="search"
              className="h-9 min-w-[240px] flex-1"
              placeholder="Пошук слова, перекладу чи примітки"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Пошук у словнику"
            />
            <Segmented value={filter} onChange={setFilter} options={FILTERS} label="Фільтр" />
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="w-[200px]" aria-label="Сортування">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Спочатку нові</SelectItem>
                <SelectItem value="az">За алфавітом</SelectItem>
                <SelectItem value="lookups">Найчастіше шукані</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visible.length === 0 ? (
            <EmptyState title="Нічого не знайдено">Змініть пошуковий запит або фільтр.</EmptyState>
          ) : (
            <div className="dict-table" role="table" aria-label="Слова">
              <div className="dict-head" role="row">
                <span role="columnheader">Слово</span>
                <span role="columnheader">Переклад</span>
                <span role="columnheader" className="col-note">
                  Примітка
                </span>
                <span role="columnheader">Додано</span>
                <span role="columnheader" className="sr-only">
                  Дії
                </span>
              </div>
              {visible.map((e) =>
                editingId === e.id ? (
                  <div className="dict-entry editing" key={e.id} role="row">
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

          <div className="dict-footer">
            <span className="secondary t-footnote">
              Показано {visible.length} з {dictionary.length}
            </span>
            <div className="row">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={!visible.length}>
                    <IconDownload />
                    Експорт
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {visible.length} {pluralUk(visible.length, 'слово', 'слова', 'слів')}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => exportTxt(visible)}>Текстовий файл (.txt)</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportDocx(visible)}>Документ Word (.docx)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {learned.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() =>
                    remove(learned, `Видалено ${learned.length} ${pluralUk(learned.length, 'вивчене слово', 'вивчені слова', 'вивчених слів')}`)
                  }
                >
                  Видалити вивчені
                </Button>
              )}
            </div>
          </div>
        </>
      )}
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
    <div className={`dict-entry${entry.learned ? ' learned' : ''}`} role="row">
      <div role="cell">
        <div className="dict-word">
          <mark>{entry.word}</mark>
        </div>
        {(entry.learned || entry.lookups > 1) && (
          <div className="muted t-footnote">{entry.learned ? 'вивчено' : `шукали ${entry.lookups} рази`}</div>
        )}
      </div>
      <div className="dict-tr" role="cell">
        {entry.translation ? entry.translation : <Badge variant="warning">без перекладу</Badge>}
      </div>
      <div className="dict-note-col" role="cell">
        {entry.note}
      </div>
      <div className="dict-date" role="cell" title={formatDate(entry.addedAt)}>
        {formatDate(entry.addedAt).split(',')[0]}
      </div>
      <div className="dict-actions" role="cell">
        <IconAction
          label={entry.learned ? 'Повернути до вивчення' : 'Позначити як вивчене'}
          ariaLabel={entry.learned ? `Повернути «${entry.word}» до вивчення` : `Позначити «${entry.word}» як вивчене`}
          pressed={entry.learned}
          onClick={onToggleLearned}
          className={entry.learned ? 'text-success' : undefined}
        >
          <IconCheck />
        </IconAction>
        <IconAction label="Редагувати" ariaLabel={`Редагувати «${entry.word}»`} onClick={onEdit}>
          <IconPencil />
        </IconAction>
        <IconAction label="Видалити" ariaLabel={`Видалити «${entry.word}»`} onClick={onDelete}>
          <IconTrash />
        </IconAction>
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
  const id = useId()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (values.word.trim()) onSubmit(values)
  }
  return (
    <form className="dict-edit" onSubmit={submit}>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-word`}>Слово англійською</Label>
        <Input
          id={`${id}-word`}
          autoFocus
          autoCapitalize="none"
          spellCheck={false}
          value={values.word}
          onChange={(e) => setValues((v) => ({ ...v, word: e.target.value }))}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-tr`}>Переклад</Label>
        <Input
          id={`${id}-tr`}
          value={values.translation}
          onChange={(e) => setValues((v) => ({ ...v, translation: e.target.value }))}
        />
      </div>
      <div className="grid gap-1.5 full">
        <Label htmlFor={`${id}-note`}>Примітка</Label>
        <Textarea
          id={`${id}-note`}
          rows={2}
          placeholder="Медичне значення терміна, приклад, асоціація"
          value={values.note}
          onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
        />
      </div>
      <div className="row full">
        <Button type="submit">{submitLabel}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Скасувати
        </Button>
      </div>
    </form>
  )
}

/** Icon-only row action with a tooltip and an accessible name. */
function IconAction({
  label,
  ariaLabel,
  onClick,
  pressed,
  className,
  children,
}: {
  label: string
  ariaLabel: string
  onClick: () => void
  pressed?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick} aria-label={ariaLabel} aria-pressed={pressed} className={className}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
