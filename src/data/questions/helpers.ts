import type { Question } from '../../types'

/** Builds a question whose correct answer is the first option. */
export function q(
  id: string,
  topic: string,
  collection: string,
  text: string,
  options: string[],
  explanation?: string,
  passageId?: string,
): Question {
  return { id, topic, collection, text, options, correct: 0, explanation, passageId }
}
