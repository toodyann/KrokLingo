import type { Collection, Passage, Question, Topic } from '../types'
import { refineTopic, TOPICS } from './topics'
import { anatomy, biochemistry, histology, microbiology, pathology, pharmacology, physiology } from './questions/basic'
import { passages, reading, terminology } from './questions/english'

export { TOPICS }

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
  ].map((q) => ({ ...q, topic: refineTopic(q.topic, q.text, q.options) })),
  passages,
}
