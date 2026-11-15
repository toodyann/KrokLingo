// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmContext } from '../components/confirmContext'
import { createSession } from '../lib/session'
import type { ActiveSession } from '../types'
import { bank, question } from '../test/fixtures'
import { renderWithApp } from '../test/render'
import { TestsPage } from './TestsPage'

// 25 anatomy questions (a topic quiz takes 20) and 3 in physiology
const qs = [
  ...Array.from({ length: 25 }, (_, i) => question(`a${i}`)),
  ...Array.from({ length: 3 }, (_, i) => question(`p${i}`, { topic: 'physiology' })),
]
const b = bank(qs)

afterEach(() => window.history.replaceState(null, '', '/'))

const running = (): ActiveSession => ({
  ...createSession({
    mode: 'exam',
    title: 'Іспит',
    questions: qs.slice(0, 10),
    timeLimitMin: 150,
    instantFeedback: false,
    threshold: 60,
    topics: [],
  }),
  answers: [0, 1, ...Array(8).fill(null)],
})

describe('TestsPage', () => {
  it('counts questions and topics of the chosen language', () => {
    renderWithApp(<TestsPage />, { bank: b })
    expect(screen.getByText('28 питань · 2 тем')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Почати тренування «.+», 20 питань/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Почати тренування «.+», 3 питань/ })).toBeTruthy()
  })

  it('offers to continue an unfinished test', () => {
    renderWithApp(<TestsPage />, { bank: b, session: running() })
    expect(screen.getByText('Відповіли на 2 з 10 · таймер іде')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Продовжити' }).getAttribute('href')).toBe('/test')
  })

  it('starts a 20-question training on a topic and opens it', async () => {
    const { state } = renderWithApp(<TestsPage />, { bank: b })
    await userEvent.click(screen.getByRole('button', { name: /20 питань/ }))
    const session = vi.mocked(state.setSession).mock.calls[0][0] as ActiveSession
    expect(session).toMatchObject({ mode: 'training', deadline: null, instantFeedback: true, topics: ['anatomy'] })
    expect(session.questions).toHaveLength(20)
    expect(new Set(session.questions.map((q) => q.qid)).size).toBe(20)
    expect(window.location.pathname).toBe('/test')
  })

  it('keeps the unfinished test when the user cancels', async () => {
    const confirm = vi.fn(async () => false)
    const { state } = renderWithApp(
      <ConfirmContext value={confirm}>
        <TestsPage />
      </ConfirmContext>,
      { bank: b, session: running() },
    )
    await userEvent.click(screen.getByRole('button', { name: /3 питань/ }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(state.setSession).not.toHaveBeenCalled()
  })
})
