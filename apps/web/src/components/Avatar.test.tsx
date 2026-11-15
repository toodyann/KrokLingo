// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../test/render'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('shows the Google picture at the given size', () => {
    const { container } = render(<Avatar user={{ id: 'u', avatarUrl: 'https://img.test/me.jpg' }} size={24} />)
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toBe('https://img.test/me.jpg')
    expect(img.getAttribute('width')).toBe('24')
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer')
  })

  it('falls back to the first letter when the picture fails to load', () => {
    const { container } = render(<Avatar user={{ id: 'u', name: 'олена', avatarUrl: 'https://img.test/x.jpg' }} />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toBe('О')
  })

  it('uses the email, then "?", without a name', () => {
    expect(render(<Avatar user={{ id: 'u', email: 'student@uni.test' }} />).container.textContent).toBe('S')
    expect(render(<Avatar user={{ id: 'u' }} />).container.textContent).toBe('?')
  })
})
