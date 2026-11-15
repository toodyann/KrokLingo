import type { Collection, Passage, Question } from '../types'
import { LETTERS, uid } from './util'

export interface ImportResult {
  collection: Collection
  questions: Question[]
  passages: Passage[]
  errors: string[]
}

interface RawQuestion {
  topic?: unknown
  text?: unknown
  question?: unknown
  options?: unknown
  answers?: unknown
  correct?: unknown
  answer?: unknown
  explanation?: unknown
  passage?: unknown
  passageTitle?: unknown
}

export const IMPORT_TEMPLATE = {
  collection: 'Назва збірника (наприклад, Буклет 2024)',
  questions: [
    {
      topic: 'anatomy',
      text: 'Which nerve provides motor innervation to the muscles of mastication?',
      options: ['Mandibular nerve', 'Maxillary nerve', 'Facial nerve', 'Hypoglossal nerve', 'Vagus nerve'],
      correct: 'A',
      explanation: 'Optional explanation in English.',
    },
    {
      topic: 'reading',
      passageTitle: 'Optional title of the reading text',
      passage: 'Optional reading text shown above the question…',
      text: 'According to the text, …',
      options: ['…', '…', '…', '…', '…'],
      correct: 2,
    },
  ],
}

function resolveCorrect(value: unknown, optionCount: number): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value >= 0 && value < optionCount ? value : null
  }
  if (typeof value === 'string') {
    const v = value.trim().toUpperCase()
    const letter = LETTERS.indexOf(v)
    if (letter >= 0 && letter < optionCount) return letter
    const n = Number(v)
    if (Number.isInteger(n) && n >= 1 && n <= optionCount) return n - 1
  }
  return null
}

export function parseImport(json: unknown, fallbackName: string): ImportResult {
  const errors: string[] = []
  const root = (Array.isArray(json) ? { questions: json } : json) as { collection?: unknown; questions?: unknown }
  if (!root || typeof root !== 'object' || !Array.isArray(root.questions)) {
    throw new Error('Очікується об’єкт з полем "questions" (масив) або просто масив питань.')
  }
  const name = typeof root.collection === 'string' && root.collection.trim() ? root.collection.trim() : fallbackName
  const collection: Collection = { id: uid('c'), name, custom: true, description: 'Імпортований збірник' }
  const passages: Passage[] = []
  const passageByText = new Map<string, string>()
  const questions: Question[] = []

  root.questions.forEach((raw: RawQuestion, i: number) => {
    const n = i + 1
    const text = typeof raw.text === 'string' ? raw.text : typeof raw.question === 'string' ? raw.question : ''
    const options = Array.isArray(raw.options) ? raw.options : Array.isArray(raw.answers) ? raw.answers : null
    if (!text.trim()) return errors.push(`Питання ${n}: немає тексту ("text").`)
    if (!options || options.length < 2 || !options.every((o) => typeof o === 'string' && o.trim())) {
      return errors.push(`Питання ${n}: потрібно щонайменше 2 текстові варіанти ("options").`)
    }
    if (options.length > LETTERS.length)
      return errors.push(`Питання ${n}: забагато варіантів (максимум ${LETTERS.length}).`)
    const correct = resolveCorrect(raw.correct ?? raw.answer, options.length)
    if (correct === null)
      return errors.push(`Питання ${n}: некоректна правильна відповідь ("correct": індекс від 0 або літера A–E).`)

    let passageId: string | undefined
    if (typeof raw.passage === 'string' && raw.passage.trim()) {
      const ptext = raw.passage.trim()
      passageId = passageByText.get(ptext)
      if (!passageId) {
        passageId = uid('p')
        passageByText.set(ptext, passageId)
        passages.push({
          id: passageId,
          title: typeof raw.passageTitle === 'string' && raw.passageTitle.trim() ? raw.passageTitle.trim() : 'Reading',
          text: ptext,
        })
      }
    }

    questions.push({
      id: uid('cq'),
      topic: typeof raw.topic === 'string' && raw.topic.trim() ? raw.topic.trim() : 'imported',
      collection: collection.id,
      text: text.trim(),
      options: (options as string[]).map((o) => o.trim()),
      correct,
      explanation: typeof raw.explanation === 'string' && raw.explanation.trim() ? raw.explanation.trim() : undefined,
      passageId,
    })
  })

  return { collection, questions, passages, errors }
}
