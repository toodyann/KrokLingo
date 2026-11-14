import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { COMPACT_QUERY, useMediaQuery } from '../lib/hooks'
import { normalizeWord } from '../lib/lemmatize'
import { useDraggableSheet } from './useDraggableSheet'
import { lookupBuiltin, lookupOnline, storageKeys } from '../lib/translate'
import { useApp } from '../store/context'
import type { TranslationSource } from '../types'
import { IconClose } from './Icons'
import { useToast } from './toastContext'
import { KnownWordsContext, LookupContext } from './wordLookupContext'

interface LookupState {
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
  builtin: 'Вбудований словник',
  online: 'Онлайн-переклад',
  manual: 'Ваш переклад',
  none: 'Переклад не знайдено',
}

export function WordLookupProvider({ children, inTest = false }: { children: ReactNode; inTest?: boolean }) {
  const { dictionary, recordLookup, settings } = useApp()
  const [state, setState] = useState<LookupState | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const requestRef = useRef(0)
  const compact = useMediaQuery(COMPACT_QUERY)

  const known = useMemo(() => new Set(dictionary.map((e) => e.word)), [dictionary])

  // Latest store values for the async lookup without re-creating `open`.
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
      if (!existing) setJustAdded(entry.word)
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

  const knownValue = useMemo(() => ({ known, justAdded }), [known, justAdded])

  return (
    <LookupContext.Provider value={open}>
      <KnownWordsContext.Provider value={knownValue}>
        {children}
        {state &&
          (compact ? (
            <WordSheet state={state} onClose={close} inTest={inTest} />
          ) : (
            <WordPopover state={state} onClose={close} />
          ))}
      </KnownWordsContext.Provider>
    </LookupContext.Provider>
  )
}

/** Shared content of the popover and the sheet. */
function WordCard({ state, onClose }: { state: LookupState; onClose: () => void }) {
  const { dictionary, updateEntry, deleteEntries, restoreEntries } = useApp()
  const toast = useToast()
  const entry = state.entryId ? dictionary.find((e) => e.id === state.entryId) : undefined
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ translation: '', note: '' })

  const startEdit = () => {
    setDraft({ translation: entry?.translation ?? '', note: entry?.note ?? '' })
    setEditing(true)
  }

  const save = () => {
    if (entry) {
      const translation = draft.translation.trim()
      updateEntry(entry.id, {
        translation,
        note: draft.note.trim(),
        source: translation !== entry.translation ? 'manual' : entry.source,
      })
    }
    setEditing(false)
  }

  const remove = () => {
    if (!entry) return onClose()
    deleteEntries([entry.id])
    toast({ message: `«${entry.word}» прибрано зі словника`, onAction: () => restoreEntries([entry]) })
    onClose()
  }

  const lemma = entry?.word ?? state.lemma
  const showLemma = lemma && lemma !== normalizeWord(state.surface)
  const translation = entry?.translation ?? state.translation
  const source = entry?.source ?? state.source

  return (
    <>
      <div className="wp-head">
        <div>
          <span className="wp-word">
            <mark>{state.surface}</mark>
          </span>
          {showLemma && <span className="wp-lemma">→ {lemma}</span>}
        </div>
        <button type="button" className="icon-btn filled" onClick={onClose} aria-label="Закрити">
          <IconClose size={16} />
        </button>
      </div>

      {state.status === 'loading' ? (
        <div className="wp-translation muted">Шукаю переклад…</div>
      ) : editing ? (
        <div className="wp-edit">
          <label className="field">
            <span>Переклад</span>
            <input
              type="text"
              autoFocus
              value={draft.translation}
              onChange={(e) => setDraft((d) => ({ ...d, translation: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </label>
          <label className="field">
            <span>Примітка</span>
            <textarea
              rows={2}
              value={draft.note}
              placeholder="Медичне значення, приклад вживання…"
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />
          </label>
          <div className="row">
            <button type="button" className="btn btn-primary btn-sm" onClick={save}>
              Зберегти
            </button>
            <button type="button" className="btn btn-plain btn-sm" onClick={() => setEditing(false)}>
              Скасувати
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={`wp-translation${translation ? '' : ' muted'}`}>
            {translation || 'Перекладу немає — додайте свій.'}
          </div>
          {entry?.note && <div className="wp-note">{entry.note}</div>}
          <div className="wp-meta">
            {source && <span>{SOURCE_LABEL[source]}</span>}
            <span className="wp-saved">{state.isNew ? 'Додано до словника' : 'Уже у словнику'}</span>
          </div>
          <div className="wp-actions">
            <button type="button" className="btn btn-plain btn-sm" onClick={startEdit}>
              Редагувати
            </button>
            <button type="button" className="btn btn-destructive btn-sm" onClick={remove}>
              Прибрати
            </button>
          </div>
        </>
      )}
    </>
  )
}

/** Close on Escape and on a tap outside — but let a tap on another word re-target in place. */
function useDismiss(ref: RefObject<HTMLElement | null>, anchor: HTMLElement, onDismiss: () => void) {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (ref.current?.contains(target) || anchor.contains(target)) return
      if (target.closest?.('.ctext .w')) return
      onDismiss()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, anchor, onDismiss])

  useEffect(() => {
    anchor.classList.add('w-active')
    return () => anchor.classList.remove('w-active')
  }, [anchor])
}

/** Regular width: a popover that points at the word and grows out of it. */
function WordPopover({ state, onClose }: { state: LookupState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; arrow: number; above: boolean } | null>(null)
  useDismiss(ref, state.anchor, onClose)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const place = () => {
      const rect = state.anchor.getBoundingClientRect()
      const pw = el.offsetWidth
      const ph = el.offsetHeight
      const gap = 12
      const vw = document.documentElement.clientWidth
      const center = rect.left + rect.width / 2
      const left = Math.max(8, Math.min(center - pw / 2, vw - pw - 8))
      const above = rect.bottom + ph + gap > window.innerHeight && rect.top - ph - gap > 0
      const top = above ? rect.top - ph - gap : rect.bottom + gap
      setPos({
        top: top + window.scrollY,
        left: left + window.scrollX,
        arrow: Math.max(18, Math.min(center - left, pw - 18)),
        above,
      })
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(el)
    window.addEventListener('resize', onClose)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onClose)
    }
  }, [state.anchor, onClose])

  return createPortal(
    <div
      ref={ref}
      className={`word-popover${pos?.above ? ' above' : ''}`}
      style={
        pos
          ? {
              top: pos.top,
              left: pos.left,
              transformOrigin: `${pos.arrow}px ${pos.above ? '100%' : '0'}`,
            }
          : { top: -9999, left: -9999, visibility: 'hidden' }
      }
      role="dialog"
      aria-label={`Переклад слова ${state.surface}`}
    >
      {pos && <span className="arrow" style={{ left: pos.arrow - 8 }} aria-hidden="true" />}
      <WordCard key={state.surface + state.entryId} state={state} onClose={onClose} />
    </div>,
    document.body,
  )
}

/**
 * Compact width: a non-blocking sheet at the bottom, within thumb reach.
 * No scrim — the question stays visible above it, so reading isn't interrupted.
 */
function WordSheet({ state, onClose, inTest }: { state: LookupState; onClose: () => void; inTest: boolean }) {
  const { ref, dismiss, handlers } = useDraggableSheet(onClose)
  useDismiss(ref, state.anchor, dismiss)

  return createPortal(
    <div
      ref={ref}
      className={`word-sheet${inTest ? ' in-test' : ''}`}
      role="dialog"
      aria-label={`Переклад слова ${state.surface}`}
      {...handlers}
    >
      <div className="grabber" aria-hidden="true" />
      <WordCard key={state.surface + state.entryId} state={state} onClose={() => dismiss()} />
    </div>,
    document.body,
  )
}
