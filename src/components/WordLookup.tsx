import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { normalizeWord } from '../lib/lemmatize'
import { lookupBuiltin, lookupOnline, storageKeys } from '../lib/translate'
import { useApp } from '../store/context'
import type { DictEntry, TranslationSource } from '../types'
import { LookupContext } from './wordLookupContext'

interface PopoverState {
  surface: string
  anchor: HTMLElement
  status: 'loading' | 'ready'
  entryId?: string
  lemma?: string
  translation?: string
  source?: TranslationSource
  isNew?: boolean
}

const SOURCE_LABEL: Record<TranslationSource, string> = {
  builtin: 'вбудований словник',
  online: 'онлайн-переклад',
  manual: 'ваш переклад',
  none: 'переклад не знайдено',
}

export function WordLookupProvider({ children }: { children: ReactNode }) {
  const { dictionary, recordLookup, settings } = useApp()
  const [state, setState] = useState<PopoverState | null>(null)
  const requestRef = useRef(0)

  // Keep latest store values for the async lookup without re-creating `open`.
  const latest = useRef({ dictionary, recordLookup, settings })
  useLayoutEffect(() => {
    latest.current = { dictionary, recordLookup, settings }
  })

  const open = useCallback(async (surface: string, anchor: HTMLElement) => {
    const req = ++requestRef.current
    const { dictionary: dict, recordLookup: record, settings: cfg } = latest.current
    const keys = storageKeys(surface)
    const existing = dict.find((e) => keys.includes(e.word))
    const builtin = lookupBuiltin(surface)
    const lemma = existing?.word ?? builtin?.lemma ?? normalizeWord(surface)

    const finish = (translation: string, source: TranslationSource) => {
      if (req !== requestRef.current) return
      const entry = record(lemma, translation, source)
      setState({
        surface,
        anchor,
        status: 'ready',
        entryId: entry.id,
        lemma: entry.word,
        translation: entry.translation,
        source: entry.source,
        isNew: !existing,
      })
    }

    if (existing?.translation) return finish(existing.translation, existing.source)
    if (builtin) return finish(builtin.translation, 'builtin')

    if (cfg.onlineTranslate && navigator.onLine) {
      setState({ surface, anchor, status: 'loading', lemma })
      try {
        const online = await lookupOnline(lemma)
        if (online) return finish(online, 'online')
      } catch {
        // network error — fall through to "not found"
      }
    }
    finish('', 'none')
  }, [])

  const close = useCallback(() => {
    requestRef.current++
    setState(null)
  }, [])

  return (
    <LookupContext.Provider value={open}>
      {children}
      {state && <WordPopover state={state} onClose={close} />}
    </LookupContext.Provider>
  )
}

function WordPopover({ state, onClose }: { state: PopoverState; onClose: () => void }) {
  const { dictionary, updateEntry, deleteEntries } = useApp()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null)
  const [editing, setEditing] = useState(false)
  const entry: DictEntry | undefined = state.entryId ? dictionary.find((e) => e.id === state.entryId) : undefined
  const [draft, setDraft] = useState({ translation: '', note: '' })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = state.anchor.getBoundingClientRect()
    const pw = el.offsetWidth
    const ph = el.offsetHeight
    const margin = 8
    const vw = document.documentElement.clientWidth
    let left = rect.left + rect.width / 2 - pw / 2
    left = Math.max(margin, Math.min(left, vw - pw - margin))
    const above = rect.bottom + ph + margin > window.innerHeight && rect.top - ph - margin > 0
    const top = above ? rect.top - ph - margin : rect.bottom + margin
    setPos({ top: top + window.scrollY, left: left + window.scrollX, above })
  }, [state, editing])

  useEffect(() => {
    state.anchor.classList.add('w-active')
    return () => state.anchor.classList.remove('w-active')
  }, [state.anchor])

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || state.anchor.contains(target)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onResize = () => onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [onClose, state.anchor])

  const startEdit = () => {
    setDraft({ translation: entry?.translation ?? '', note: entry?.note ?? '' })
    setEditing(true)
  }

  const save = () => {
    if (entry) {
      updateEntry(entry.id, {
        translation: draft.translation.trim(),
        note: draft.note.trim(),
        source: draft.translation.trim() !== entry.translation ? 'manual' : entry.source,
      })
    }
    setEditing(false)
  }

  const remove = () => {
    if (entry) deleteEntries([entry.id])
    onClose()
  }

  const lemma = entry?.word ?? state.lemma
  const showLemma = lemma && lemma !== normalizeWord(state.surface)
  const translation = entry?.translation ?? state.translation
  const source = entry?.source ?? state.source

  return createPortal(
    <div
      ref={ref}
      className={`word-popover${pos?.above ? ' above' : ''}`}
      style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}
      role="dialog"
      aria-label={`Переклад слова ${state.surface}`}
    >
      <div className="wp-head">
        <div>
          <span className="wp-word">{state.surface}</span>
          {showLemma && <span className="wp-lemma">→ {lemma}</span>}
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрити">
          ×
        </button>
      </div>

      {state.status === 'loading' ? (
        <div className="wp-translation muted">Шукаю переклад…</div>
      ) : editing ? (
        <div className="wp-edit">
          <label>
            Переклад
            <input
              autoFocus
              value={draft.translation}
              onChange={(e) => setDraft((d) => ({ ...d, translation: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </label>
          <label>
            Примітка
            <textarea
              rows={2}
              value={draft.note}
              placeholder="Медичне значення, приклад вживання…"
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />
          </label>
          <div className="wp-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={save}>
              Зберегти
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
              Скасувати
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={`wp-translation${translation ? '' : ' muted'}`}>
            {translation || 'Перекладу немає — додайте свій'}
          </div>
          {entry?.note && <div className="wp-note">{entry.note}</div>}
          <div className="wp-meta">
            {source && <span>{SOURCE_LABEL[source]}</span>}
            <span className="wp-saved">{state.isNew ? '＋ додано до словника' : '✓ уже у словнику'}</span>
          </div>
          <div className="wp-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={startEdit}>
              Редагувати
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={remove}>
              Прибрати зі словника
            </button>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}
