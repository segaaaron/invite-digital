import { expect, it } from 'vitest'
import { invitationUrl } from './invitation-url'

it('construye la URL con el token, sin barra doble', () => {
  expect(invitationUrl('abc123', 'https://invitepremium.bo/')).toBe('https://invitepremium.bo/i/abc123')
  expect(invitationUrl('abc123', 'https://invitepremium.bo')).toBe('https://invitepremium.bo/i/abc123')
})
