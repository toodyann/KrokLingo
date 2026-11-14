import type { Collection, Passage, Question, Topic } from '../types'
import { anatomy, biochemistry, histology, microbiology, pathology, pharmacology, physiology } from './questions/basic'
import { passages, reading, terminology } from './questions/english'

export const TOPICS: Topic[] = [
  { id: 'anatomy', name: 'Анатомія' },
  { id: 'histology', name: 'Гістологія та ембріологія' },
  { id: 'physiology', name: 'Фізіологія' },
  { id: 'biochemistry', name: 'Біохімія' },
  { id: 'microbiology', name: 'Мікробіологія' },
  { id: 'pharmacology', name: 'Фармакологія' },
  { id: 'pathology', name: 'Патологія' },
  { id: 'terminology', name: 'Термінологія та граматика' },
  { id: 'reading', name: 'Читання (Reading)' },
]

export const COLLECTIONS: Collection[] = [
  {
    id: 'basic',
    name: 'Базові медичні дисципліни',
    description: 'Ситуаційні задачі у форматі Кроку 1 англійською',
  },
  {
    id: 'english',
    name: 'Професійна англійська',
    description: 'Терміни, граматика та тексти для читання',
  },
]

export const BUILTIN_BANK: {
  topics: Topic[]
  collections: Collection[]
  questions: Question[]
  passages: Passage[]
} = {
  topics: TOPICS,
  collections: COLLECTIONS,
  questions: [
    ...anatomy,
    ...histology,
    ...physiology,
    ...biochemistry,
    ...microbiology,
    ...pharmacology,
    ...pathology,
    ...terminology,
    ...reading,
  ],
  passages,
}
