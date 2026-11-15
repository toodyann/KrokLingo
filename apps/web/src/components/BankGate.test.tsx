// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '../test/render'
import { BankGate } from './BankGate'

describe('BankGate', () => {
  it('says the questions are loading', () => {
    render(<BankGate error={null} onRetry={() => {}} />)
    expect(screen.getByRole('heading').textContent).toBe('Завантажуємо питання…')
    expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows the error and retries on request', async () => {
    const onRetry = vi.fn()
    render(<BankGate error="Сервер питань відповів 503" onRetry={onRetry} />)
    expect(screen.getByRole('heading').textContent).toBe('Не вдалося завантажити питання')
    expect(screen.getByText('Сервер питань відповів 503')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Спробувати ще раз' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
