import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createCredential } from './credential'

describe('createCredential', () => {
  it('normaliza el correo a minúsculas y sin espacios', () => {
    const result = createCredential({ email: '  Atelier@Invite.BO ', password: 'contrasena-larga-1' })
    expect(isOk(result) && result.value.email).toBe('atelier@invite.bo')
  })

  it('rechaza un correo sin arroba', () => {
    const result = createCredential({ email: 'atelier', password: 'contrasena-larga-1' })
    expect(isErr(result) && result.error.kind).toBe('invalid_email')
  })

  it('rechaza una contraseña de menos de 12 caracteres', () => {
    const result = createCredential({ email: 'a@b.bo', password: 'corta1' })
    expect(isErr(result) && result.error.kind).toBe('weak_password')
  })

  it('no recorta la contraseña: los espacios son parte de ella', () => {
    const result = createCredential({ email: 'a@b.bo', password: '  espacios cuentan  ' })
    expect(isOk(result) && result.value.password).toBe('  espacios cuentan  ')
  })
})
