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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { normalizeWord } from '../lib/lemmatize'
import { analyzeText } from '../lib/text'
import { lookupOnline, resolveTranslation, type ClickContext, type Resolution, type UserLexicon } from '../lib/translate'
import { useApp } from '../store/context'
import type { Certainty, DictEntry, ResolutionSource } from '../types'
import { useDraggableSheet } from './useDraggableSheet'
import { IconClose } from './Icons'
import { useToast } from './toastContext'
import { KnownWordsContext, LookupContext } from './wordLookupContext'

interface LookupState {
  click: ClickContext
  surface: string
  anchor: HTMLElement
  status: 'loading' | 'ready'
  /** Machine translation fetched for this click (used only when offline data has nothing). */
  online?: string
  entryId?: string
  isNew?: boolean
}

const SOURCE_LABEL: Record<ResolutionSource, string> = {
  'user-context': 'Ваш переклад для цього питання',
  user: 'Ваш переклад',
  question: 'Перевірено для цього питання',
  phrase: 'Медичний термін',
  latin: 'Латинська анатомічна назва',
  abbr: 'Абревіатура',
  context: 'Значення за контекстом',
  dictionary: 'Вбудований словник',
  online: 'Машинний переклад (онлайн)',
  none: 'Переклад не знайдено',
}

const CERTAINTY_LABEL: Record<Certainty, string> = {
  verified: 'перевірено',
  likely: 'ймовірно',
  uncertain: 'неточно',
  unknown: 'невідомо',
}

function lexiconOf(dictionary: DictEntry[]): UserLexicon {
  const byKey = new Map(dictionary.map((e) => [e.word.toLowerCase(), e]))
  return (key) => byKey.get(key.toLowerCase())
}

/** A machine translation is the very last resort, and is always marked as unchecked. */
function withOnline(r: Resolution, online: string | undefined, cached: DictEntry | undefined): Resolution {
  if (r.certainty !== 'unknown') return r
  const text = online ?? (cached?.source === 'online' ? cached.translation : undefined)
  if (!text) return r
  return {
    ...r,
    translation: text,
    source: 'online',
    certainty: 'uncertain',
    hint: 'Машинний переклад без урахування медичного контексту — перевірте його.',
  }
}

export function WordLookupProvider({ children, inTest = false }: { children: ReactNode; inTest?: boolean }) {
  const { dictionary, recordLookup, settings } = useApp()
  const [state, setState] = useState<LookupState | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const requestRef = useRef(0)
  const compact = useMediaQuery(COMPACT_QUERY)

  const known = useMemo(() => new Set(dictionary.map((e) => e.word.toLowerCase())), [dictionary])

  // Latest store values for the async lookup without re-creating `open`.
  const latest = useRef({ dictionary, recordLookup, settings })
  useLayoutEffect(() => {
    latest.current = { dictionary, recordLookup, settings }
  })

  const open = useCallback(async (click: ClickContext, anchor: HTMLElement) => {
    const req = ++requestRef.current
    const { dictionary: dict, recordLookup: record, settings: cfg } = latest.current
    const lexicon = lexiconOf(dict)
    const surface = analyzeText(click.text).tokens[click.index]?.text ?? ''
    let resolution = resolveTranslation(click, lexicon)
    const cached = lexicon(resolution.key)

    let online: string | undefined
    const hasCachedOnline = cached?.source === 'online' && !!cached.translation
    if (resolution.certainty === 'unknown' && resolution.kind !== 'latin' && !hasCachedOnline && cfg.onlineTranslate && navigator.onLine) {
      setState({ click, surface, anchor, status: 'loading' })
      try {
        online = (await lookupOnline(resolution.kind === 'phrase' ? resolution.unitText : resolution.lemma)) ?? undefined
      } catch {
        // network error — the result stays "unknown"
      }
    }
    if (req !== requestRef.current) return
    resolution = withOnline(resolution, online, cached)
    const entry = record(resolution)
    if (!cached) setJustAdded(entry.word)
    setState({ click, surface, anchor, status: 'ready', online, entryId: entry.id, isNew: !cached })
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

/** The sentence with the translated unit emphasised. */
function ContextLine({ r }: { r: Resolution }) {
  const s = r.sentence
  if (!s || s === r.unitText) return null
  const at = s.toLowerCase().indexOf(r.unitText.toLowerCase())
  const long = s.length > 180
  if (at < 0) return <div className="wp-context">{long ? s.slice(0, 177) + '…' : s}</div>
  const from = long ? Math.max(0, at - 70) : 0
  const to = long ? Math.min(s.length, at + r.unitText.length + 70) : s.length
  return (
    <div className="wp-context">
      {from > 0 && '…'}
      {s.slice(from, at)}
      <b>{s.slice(at, at + r.unitText.length)}</b>
      {s.slice(at + r.unitText.length, to)}
      {to < s.length && '…'}
    </div>
  )
}

/** Shared content of the popover and the sheet. */
function WordCard({ state, onClose }: { state: LookupState; onClose: () => void }) {
  const { dictionary, updateEntry, deleteEntries, restoreEntries, setContextTranslation } = useApp()
  const toast = useToast()
  const entry = state.entryId ? dictionary.find((e) => e.id === state.entryId) : undefined
  const contextId = state.click.contextId
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ translation: '', note: '', onlyHere: false })

  // re-resolved from the live dictionary, so an edit shows up at once
  const r = useMemo(
    () => withOnline(resolveTranslation(state.click, lexiconOf(dictionary)), state.online, entry),
    [state.click, state.online, dictionary, entry],
  )
  const ownHere = !!(contextId && entry?.contextual?.[contextId])

  const startEdit = () => {
    setDraft({ translation: r.translation || entry?.translation || '', note: entry?.note ?? '', onlyHere: ownHere })
    setEditing(true)
  }

  const save = () => {
    if (!entry) return setEditing(false)
    const translation = draft.translation.trim()
    if (draft.onlyHere && contextId) {
      setContextTranslation(entry.id, contextId, translation || null)
      updateEntry(entry.id, { note: draft.note.trim() })
    } else {
      if (ownHere && contextId) setContextTranslation(entry.id, contextId, null)
      const changed = translation !== entry.translation
      updateEntry(entry.id, {
        translation,
        note: draft.note.trim(),
        ...(changed ? { source: 'manual' as const, origin: 'user' as const, certainty: 'verified' as const } : {}),
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

  const showLemma = r.kind === 'word' && !!r.lemma && r.lemma !== normalizeWord(state.surface)
  const isUnit = r.kind !== 'word' && normalizeWord(r.unitText) !== normalizeWord(state.surface)

  return (
    <>
      <div className="wp-head">
        <div>
          <span className="wp-word">
            <mark>{state.surface}</mark>
          </span>
          {showLemma && <span className="wp-lemma">→ {r.lemma}</span>}
          {isUnit && <div className="wp-unit">у складі «{r.unitText}»</div>}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Закрити">
          <IconClose size={16} />
        </Button>
      </div>

      {state.status === 'loading' ? (
        <div className="wp-translation muted">Шукаю переклад…</div>
      ) : editing ? (
        <div className="wp-edit">
          <div className="grid gap-1.5">
            <Label htmlFor="wp-translation">Переклад «{r.kind === 'word' ? r.lemma : r.unitText}»</Label>
            <Input
              id="wp-translation"
              autoFocus
              value={draft.translation}
              onChange={(e) => setDraft((d) => ({ ...d, translation: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </div>
          {contextId && (
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="wp-only-here" className="font-normal text-muted-foreground">
                Лише для цього питання
              </Label>
              <Switch
                id="wp-only-here"
                checked={draft.onlyHere}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, onlyHere: v }))}
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="wp-note">Примітка</Label>
            <Textarea
              id="wp-note"
              rows={2}
              value={draft.note}
              placeholder="Медичне значення, приклад вживання…"
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />
          </div>
          <div className="row">
            <Button size="sm" onClick={save}>
              Зберегти
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Скасувати
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={`wp-translation${r.translation ? '' : ' muted'}`}>
            {r.translation || 'Перекладу немає у вбудованому словнику — додайте свій.'}
          </div>
          {r.wordMeaning && isUnit && (
            <div className="wp-word-meaning">
              {state.surface} тут — <b>{r.wordMeaning}</b>
            </div>
          )}
          {r.alternatives.length > 0 && <div className="wp-alternatives">Інші значення: {r.alternatives.join('; ')}</div>}
          {r.hint && <div className="wp-hint">{r.hint}</div>}
          {entry?.note && <div className="wp-note">{entry.note}</div>}
          <ContextLine r={r} />
          <div className="wp-meta">
            <span className={`wp-certainty ${r.certainty}`}>{CERTAINTY_LABEL[r.certainty]}</span>
            <span>{SOURCE_LABEL[r.source]}</span>
            <span className="wp-saved">{state.isNew ? 'Додано до словника' : 'Уже у словнику'}</span>
          </div>
          <div className="row">
            <Button size="sm" variant="outline" onClick={startEdit}>
              {r.translation ? 'Виправити' : 'Додати переклад'}
            </Button>
            {ownHere && contextId && entry && (
              <Button size="sm" variant="ghost" onClick={() => setContextTranslation(entry.id, contextId, null)}>
                Скинути для питання
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={remove}>
              Прибрати
            </Button>
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
