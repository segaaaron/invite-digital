import { describe, expect, it } from 'vitest'
import {
  MAX_SHOWCASE_MUSIC_BYTES,
  esMp3,
  showcaseMusicKey,
  themeOfShowcaseKey,
} from './showcase-music'

const bytes = (...valores: number[]) => new Uint8Array(valores)

describe('esMp3', () => {
  it('reconoce un MP3 con etiqueta ID3 delante', () => {
    expect(esMp3(bytes(0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0, 0, 0x02, 0x01))).toBe(true)
  })

  it('reconoce un MP3 que empieza por una trama', () => {
    // `0xFB` y `0xF3` son MPEG-1 capa III; `0xE0` es el mínimo que cumple el sincronismo.
    expect(esMp3(bytes(0xff, 0xfb, 0x90, 0x00))).toBe(true)
    expect(esMp3(bytes(0xff, 0xf3, 0x48, 0x00))).toBe(true)
    expect(esMp3(bytes(0xff, 0xe0, 0x00, 0x00))).toBe(true)
  })

  it('rechaza un JPEG, que también empieza por 0xFF', () => {
    // Es la razón de que el descarte vaya delante. Sin él, una fotografía renombrada se
    // serviría como audio desde nuestro propio origen.
    expect(esMp3(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(false)
  })

  it('rechaza lo que no es audio', () => {
    expect(esMp3(bytes(0x89, 0x50, 0x4e, 0x47))).toBe(false)
    expect(esMp3(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45))).toBe(false)
    expect(esMp3(bytes(0x3c, 0x21, 0x44, 0x4f))).toBe(false)
    expect(esMp3(bytes())).toBe(false)
  })
})

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

describe('el tope', () => {
  it('son tres megabytes, menos que el de las fotografías de una boda', () => {
    // Esto lo sirve la web pública a cualquiera, no a los invitados de un evento.
    expect(MAX_SHOWCASE_MUSIC_BYTES).toBe(3 * 1024 * 1024)
  })
})
