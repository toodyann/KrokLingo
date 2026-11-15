import { TOPICS } from '../data/topics'
import type { CustomBank, Lang, Question } from '../types'
import type { ServerBank } from '../lib/bankSource'
import type { Bank } from './context'

/**
 * The bank the app works with: the server's questions plus the user's imported ones. Tests are
 * drawn from the chosen question language; the lookups cover every language, so history and
 * results always resolve.
 */
export function buildBank(
  serverBank: Pick<ServerBank, 'collections' | 'questions' | 'passages'> | null,
  customBank: CustomBank,
  questionLang: Lang,
): Bank {
  const topics = [...TOPICS]
  const knownTopics = new Set(topics.map((t) => t.id))
  for (const q of customBank.questions) {
    if (!knownTopics.has(q.topic)) {
      knownTopics.add(q.topic)
      topics.push({ id: q.topic, name: q.topic })
    }
  }
  const server = serverBank ?? { collections: [], questions: [], passages: [] }
  const allCollections = [...server.collections, ...customBank.collections]
  const allQuestions = [...server.questions, ...customBank.questions]
  const passages = [...server.passages, ...customBank.passages]
  const topicNames = new Map(topics.map((t) => [t.id, t.name]))
  const collectionById = new Map(allCollections.map((c) => [c.id, c]))
  const langOf = (q: Question): Lang => collectionById.get(q.collection)?.lang ?? 'en'

  const counts = new Map<Lang, number>()
  for (const q of allQuestions) counts.set(langOf(q), (counts.get(langOf(q)) ?? 0) + 1)
  const langs = (['en', 'uk'] as const).filter((l) => counts.has(l)).map((lang) => ({ lang, count: counts.get(lang)! }))
  // the chosen language, or English when the bank has none in it (yet)
  const lang: Lang = counts.has(questionLang) ? questionLang : 'en'

  return {
    topics,
    collections: allCollections.filter((c) => (c.lang ?? 'en') === lang),
    questions: allQuestions.filter((q) => langOf(q) === lang),
    passages,
    questionById: new Map(allQuestions.map((q) => [q.id, q])),
    passageById: new Map(passages.map((p) => [p.id, p])),
    collectionById,
    topicName: (id: string) => topicNames.get(id) ?? id,
    lang,
    langs,
    langOf,
  }
}
