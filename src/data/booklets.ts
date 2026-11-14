import type { Collection, Passage, Question } from '../types'
import { refineTopic } from './topics'

// Real Krok 1 (Dentistry, English) items, built by scripts/booklets from the official 2007–2018 booklets
// (ONMedU mirror of the Testing Center PDFs) and the 2018–2024 English sets on medical-club.net.
// One JSON file per collection; each becomes its own small chunk and they load in parallel.
// Rows are compact: [id, topic, text, options (correct first), passageId?].

type Row = [string, string, string, string[], string?]

interface CollectionFile {
  collection: Collection
  passages: Passage[]
  questions: Row[]
}

export interface BookletBank {
  collections: Collection[]
  passages: Passage[]
  questions: Question[]
}

const files = import.meta.glob<CollectionFile>('./booklets/*.json', { import: 'default' })

/** Booklets first (by year), then the professional English exams. */
const rank = (id: string) => (id.startsWith('krok-') ? 0 : 1)

export async function loadBooklets(): Promise<BookletBank> {
  const parts = (await Promise.all(Object.values(files).map((load) => load()))).sort(
    (a, b) => rank(a.collection.id) - rank(b.collection.id) || a.collection.id.localeCompare(b.collection.id),
  )
  return {
    collections: parts.map((p) => p.collection),
    passages: parts.flatMap((p) => p.passages),
    questions: parts.flatMap((p) =>
      p.questions.map(([id, topic, text, options, passageId]) => ({
        id,
        topic: refineTopic(topic, text, options),
        collection: p.collection.id,
        text,
        options,
        correct: 0,
        passageId,
      })),
    ),
  }
}
