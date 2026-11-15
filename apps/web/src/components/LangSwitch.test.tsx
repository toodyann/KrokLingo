// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { bank, question } from '../test/fixtures'
import { renderWithApp } from '../test/render'
import { LangSwitch } from './LangSwitch'

const both = bank([question('e1'), question('u1', { collection: 'uk-col' })])

describe('LangSwitch', () => {
  it('switches the question language', async () => {
    const { state } = renderWithApp(<LangSwitch />, { bank: both })
    expect(screen.getByRole('tablist', { name: 'Мова питань' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'English' }).getAttribute('aria-selected')).toBe('true')
    await userEvent.click(screen.getByRole('tab', { name: 'Українська' }))
    expect(state.updateSettings).toHaveBeenCalledWith({ questionLang: 'uk' })
  })

  it('is hidden while the bank has one language', () => {
    const { container } = renderWithApp(<LangSwitch />, { bank: bank([question('e1')]) })
    expect(container.innerHTML).toBe('')
  })
})
