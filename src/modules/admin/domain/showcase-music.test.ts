import { describe, expect, it } from 'vitest'
import { showcaseMusicKey, themeOfShowcaseKey } from './showcase-music'

describe('showcaseMusicKey', () => {
  it('compone la fila de ajustes de un modelo', () => {
    expect(showcaseMusicKey('boda-bot')).toBe('showcase.music.boda-bot')
  })

  it('rechaza una clave que no es de un modelo', () => {
    // **La prueba que importa.** La clave acaba dentro de `app_settings.key`: sin este
    // corte, quien controle ese valor escribe en cualquier otra fila de ajustes.
    expect(showcaseMusicKey('../payment.accountNumber')).toBeNull()
    expect(showcaseMusicKey('payment.accountNumber')).toBeNull()
    expect(showcaseMusicKey('BODA')).toBeNull()
    expect(showcaseMusicKey('')).toBeNull()
    expect(showcaseMusicKey('a'.repeat(41))).toBeNull()
  })
})

describe('themeOfShowcaseKey', () => {
  it('saca el modelo de su fila', () => {
    expect(themeOfShowcaseKey('showcase.music.xv-isabelle')).toBe('xv-isabelle')
  })

  it('ignora las filas que no son de música', () => {
    expect(themeOfShowcaseKey('payment.bank')).toBeNull()
    expect(themeOfShowcaseKey('showcase.music.')).toBeNull()
  })
})
