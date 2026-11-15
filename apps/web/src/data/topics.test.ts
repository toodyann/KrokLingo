import { describe, expect, it } from 'vitest'
import { refineTopic, TOPICS } from './topics'

// The bank files the API serves (apps/api/bank): [id, topic, …] rows or { id, topic, … } objects.
const files = import.meta.glob<{ questions: unknown[] }>('../../../api/bank/*.json', { eager: true, import: 'default' })
const bankQuestions = Object.values(files).flatMap((file) =>
    file.questions.map((q) => {
      const [id, topic, text, options] = Array.isArray(q)
        ? (q as [string, string, string, string[]])
        : [(q as { id: string }).id, (q as { topic: string }).topic, (q as { text: string }).text, (q as { options: string[] }).options]
      return { id, topic: refineTopic(topic, text, options) }
    }),
)

describe('detailed topics', () => {
  it('moves head, neck and dental anatomy out of general anatomy', () => {
    expect(refineTopic('anatomy', 'After the extraction of the lower first premolar the patient had bleeding. What artery was damaged?', ['Inferior alveolar'])).toBe('anatomy-head')
    expect(refineTopic('anatomy', 'A boy cannot abduct his arm after a fall. Which muscle of the shoulder is injured?', ['M. deltoideus'])).toBe('anatomy')
  })

  it('separates embryology (including tooth development) from histology', () => {
    expect(refineTopic('histology', 'In the uterine cavity an embryo was found that was not attached to the endometrium. What stage is it?', ['Blastocyst'])).toBe('embryology')
    expect(refineTopic('histology', 'Enamel hypoplasia is caused by disturbed activity of the inner enamel epithelium of the enamel organ.', ['Ameloblasts'])).toBe('embryology')
    expect(refineTopic('histology', 'A microspecimen of heart shows cells connected by intercalated discs. Name these cells.', ['Cardiomyocytes'])).toBe('histology')
  })

  it('separates immunology from microbiology', () => {
    expect(refineTopic('microbiology', 'A child with suspected tuberculosis has undergone Mantoux test. What was administered?', ['Tuberculin'])).toBe('immunology')
    expect(refineTopic('microbiology', 'Gram-positive cocci forming chains grew on blood agar. Name the causative agent.', ['Streptococcus'])).toBe('microbiology')
  })

  it('separates pathophysiology from pathological anatomy', () => {
    expect(refineTopic('pathology', 'What is the leading mechanism of edema development in a patient with nephrotic syndrome?', ['Decreased oncotic pressure'])).toBe('pathophysiology')
    expect(refineTopic('pathology', 'Autopsy revealed a dense grey tumour; microscopy shows atypical cells with metastases. Name the tumour.', ['Carcinoma'])).toBe('pathology')
  })

  it('leaves other subjects unchanged', () => {
    expect(refineTopic('pharmacology', 'What drug blocks the sodium channels?', ['Lidocaine'])).toBe('pharmacology')
  })

  it('every question in the bank has a known topic', () => {
    const ids = new Set(TOPICS.map((t) => t.id))
    expect(bankQuestions.length).toBeGreaterThan(2000)
    for (const q of bankQuestions) expect(ids.has(q.topic), q.id).toBe(true)
  })
})
