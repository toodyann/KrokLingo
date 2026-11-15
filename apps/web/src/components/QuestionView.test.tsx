// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { bank, question } from '../test/fixtures'
import { renderWithApp } from '../test/render'
import { QuestionView } from './QuestionView'
import { LookupContext } from './wordLookupContext'

const q = question('q1', {
  text: 'Which nerve supplies the masseter?',
  options: ['Mandibular nerve', 'Facial nerve', 'Vagus nerve'],
  correct: 0,
  explanation: 'The masseter is a muscle of mastication.',
  passageId: 'p1',
})
const uq = question('u1', { collection: 'uk-col', text: 'Який нерв?', options: ['Нижньощелепний', 'Лицевий'] })
const b = bank([q, uq], { passages: [{ id: 'p1', title: 'Muscles', text: 'Muscles move the jaw.' }] })

const options = () => screen.getAllByRole('radio')

describe('QuestionView', () => {
  it('shows the options in the session’s order, lettered from A', () => {
    renderWithApp(<QuestionView question={q} order={[2, 0, 1]} chosen={null} reveal={false} onChoose={() => {}} />, {
      bank: b,
    })
    expect(options().map((o) => o.textContent)).toEqual(['AVagus nerve', 'BMandibular nerve', 'CFacial nerve'])
    expect(screen.getByText('Текст для читання: Muscles')).toBeTruthy()
  })

  it('reports the original index of the chosen option, by row or by letter', async () => {
    const onChoose = vi.fn()
    renderWithApp(<QuestionView question={q} order={[2, 0, 1]} chosen={null} reveal={false} onChoose={onChoose} />, {
      bank: b,
    })
    await userEvent.click(options()[0])
    await userEvent.click(screen.getByRole('button', { name: 'Варіант C' }))
    expect(onChoose.mock.calls).toEqual([[2], [1]])
  })

  it('marks the chosen option before the answer is revealed', () => {
    renderWithApp(<QuestionView question={q} order={[0, 1, 2]} chosen={1} reveal={false} onChoose={() => {}} />, {
      bank: b,
    })
    expect(options()[1].getAttribute('aria-checked')).toBe('true')
    expect(options()[1].className).toContain('selected')
    expect(screen.queryByText(/Пояснення/)).toBeNull()
  })

  it('reveals the right answer, the wrong choice and the explanation', () => {
    renderWithApp(<QuestionView question={q} order={[0, 1, 2]} chosen={1} reveal />, { bank: b })
    expect(options()[0].className).toContain('correct')
    expect(within(options()[0]).getByText('✓ правильна')).toBeTruthy()
    expect(options()[1].className).toContain('wrong')
    expect(within(options()[1]).getByText('✗ ваша відповідь')).toBeTruthy()
    expect(screen.getByText(/Пояснення/)).toBeTruthy()
  })

  it('locks the options when it is read-only', () => {
    renderWithApp(<QuestionView question={q} order={[0, 1, 2]} chosen={null} reveal />, { bank: b })
    for (const button of screen.getAllByRole('button')) expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('looks up a clicked English word in its sentence', async () => {
    const lookup = vi.fn()
    renderWithApp(
      <LookupContext value={lookup}>
        <QuestionView question={q} order={[0, 1, 2]} chosen={null} reveal={false} onChoose={() => {}} />
      </LookupContext>,
      { bank: b },
    )
    await userEvent.click(screen.getByText('masseter'))
    expect(lookup).toHaveBeenCalledWith(
      expect.objectContaining({ text: q.text, contextId: 'q1', index: 4 }),
      expect.any(HTMLElement),
    )
  })

  it('keeps Ukrainian questions as plain text', () => {
    const { container } = renderWithApp(
      <QuestionView question={uq} order={[0, 1]} chosen={null} reveal={false} onChoose={() => {}} />,
      { bank: b },
    )
    expect(screen.getByText('Який нерв?')).toBeTruthy()
    expect(container.querySelector('.ctext')).toBeNull()
  })
})
