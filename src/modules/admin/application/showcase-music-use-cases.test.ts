import { describe, expect, it, vi } from 'vitest'
import type { Actor } from '@/modules/identity/domain/access'
import { isErr, isOk } from '@/shared/result'
import type { AdminRepository, FileStore, SettingsRepository } from './ports'
import { readShowcaseMusic, removeShowcaseMusic, saveShowcaseMusic, readShowcaseSongs, renameShowcaseSong } from './showcase-music-use-cases'

const ADMIN: Actor = { userId: 'u1', email: 'admin@invitepremium.bo', role: 'admin', mustChangePassword: false }

/** Un MP3 con su etiqueta ID3, que es como llega casi cualquiera. */
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0, 0, 0x02, 0x01, 7, 7, 7])
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
/** Lo que devuelve `ffmpeg`: otro MP3, ya ajustado. */
const AJUSTADO = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 9, 9])

function dobles(filas: Record<string, string> = {}) {
  const disco = new Map<string, Uint8Array>()

  const settings: SettingsRepository = {
    readAll: vi.fn(async () => ({ ...filas })),
    write: vi.fn(async (entradas) => {
      Object.assign(filas, entradas)
    }),
  }

  const storage: FileStore = {
    put: vi.fn(async (key, bytes) => {
      disco.set(key, bytes)
    }),
    get: vi.fn(async (key) => disco.get(key) ?? null),
    remove: vi.fn(async (key) => {
      disco.delete(key)
    }),
  }

  const admin = { record: vi.fn(async () => {}) } as unknown as AdminRepository

  // Se comporta como `ffmpeg`: lo que no es audio vuelve `null`, y el audio sale ajustado.
  const audio = {
    normalize: vi.fn(async (bytes: Uint8Array) => (bytes === JPEG ? null : { mp3: AJUSTADO, titulo: 'Mi Vals', artista: 'Cuarteto Andino' })),
  }

  return { settings, storage, admin, audio, disco, filas, newKey: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }
}

describe('saveShowcaseMusic', () => {
  it('guarda la canción ya ajustada y deja la fila apuntando al fichero', async () => {
    const deps = dobles()

    const salida = await saveShowcaseMusic(deps)(ADMIN, { themeKey: 'boda-bot', bytes: MP3, nombreArchivo: 'cancion.mp3' })

    expect(isOk(salida)).toBe(true)
    // Lo que llega al disco es lo que devolvió `ffmpeg`, no lo que se subió.
    expect(deps.disco.get('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.mp3')).toBe(AJUSTADO)
    expect(deps.filas['showcase.music.boda-bot']).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.mp3')
    // Y el nombre del reproductor, el del archivo que suena: no el del contenido de muestra.
    expect(JSON.parse(deps.filas['showcase.song.boda-bot']!)).toEqual({ track: 'Mi Vals', artist: 'Cuarteto Andino' })
  })

  it('rechaza una clave que no es un modelo, y NO escribe nada', async () => {
    // **La prueba que de verdad protege algo.** Esa clave acaba dentro de
    // `app_settings.key`: sin el corte, esto sobrescribiría la cuenta bancaria del atelier.
    const deps = dobles()

    const salida = await saveShowcaseMusic(deps)(ADMIN, { themeKey: 'payment.accountNumber', bytes: MP3, nombreArchivo: 'cancion.mp3' })

    expect(isErr(salida)).toBe(true)
    expect(deps.settings.write).not.toHaveBeenCalled()
    expect(deps.storage.put).not.toHaveBeenCalled()
  })

  it('rechaza lo que no es audio, aunque se llame .mp3', async () => {
    const deps = dobles()

    const salida = await saveShowcaseMusic(deps)(ADMIN, { themeKey: 'boda-bot', bytes: JPEG, nombreArchivo: 'cancion.mp3' })

    expect(isErr(salida)).toBe(true)
    expect(deps.storage.put).not.toHaveBeenCalled()
  })

  it('al reemplazar, borra el fichero anterior', async () => {
    // Sin esto, cambiar la canción de un modelo diez veces deja diez huérfanos en el
    // volumen y nadie sabe después cuáles sobran.
    const deps = dobles({ 'showcase.music.boda-bot': 'vieja.mp3' })
    deps.disco.set('vieja.mp3', new Uint8Array([1]))

    await saveShowcaseMusic(deps)(ADMIN, { themeKey: 'boda-bot', bytes: MP3, nombreArchivo: 'cancion.mp3' })

    expect(deps.storage.remove).toHaveBeenCalledWith('vieja.mp3')
    expect(deps.disco.has('vieja.mp3')).toBe(false)
  })

  it('lo anota en la auditoría', async () => {
    const deps = dobles()

    await saveShowcaseMusic(deps)(ADMIN, { themeKey: 'boda-bot', bytes: MP3, nombreArchivo: 'cancion.mp3' })

    expect(deps.admin.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorEmail: ADMIN.email, action: 'escaparate.musica', subject: 'boda-bot' }),
    )
  })
})

describe('readShowcaseMusic', () => {
  it('devuelve solo los modelos con música, y no las demás filas de ajustes', async () => {
    const deps = dobles({
      'payment.bank': 'Banco Nacional',
      'showcase.music.boda-bot': 'uno.mp3',
      'showcase.music.xv-isabelle': 'dos.mp3',
      // Vacío es «sin música»: así se quita sin borrar la fila.
      'showcase.music.boda-cin': '',
    })

    const salida = await readShowcaseMusic(deps)()

    expect(isOk(salida) && salida.value).toEqual({ 'boda-bot': 'uno.mp3', 'xv-isabelle': 'dos.mp3' })
  })
})

describe('removeShowcaseMusic', () => {
  it('deja el modelo mudo y borra su fichero', async () => {
    const deps = dobles({ 'showcase.music.boda-bot': 'uno.mp3' })
    deps.disco.set('uno.mp3', MP3)

    const salida = await removeShowcaseMusic(deps)(ADMIN, 'boda-bot')

    expect(isOk(salida)).toBe(true)
    expect(deps.filas['showcase.music.boda-bot']).toBe('')
    expect(deps.disco.has('uno.mp3')).toBe(false)
  })
})

describe('readShowcaseSongs', () => {
  it('devuelve el nombre de cada modelo guardado al subir, y descarta filas rotas', async () => {
    const deps = dobles()
    await saveShowcaseMusic(deps)(ADMIN, { themeKey: 'xv-valeria', bytes: MP3, nombreArchivo: 'cancion.mp3' })
    deps.filas['showcase.song.boda-bot'] = '{roto'

    const canciones = await readShowcaseSongs(deps)()

    expect(canciones).toEqual({ 'xv-valeria': { track: 'Mi Vals', artist: 'Cuarteto Andino' } })
  })
})

describe('nombre de la canción', () => {
  it('al subir manda el nombre que escribe el admin sobre el del archivo', async () => {
    const deps = dobles()
    await saveShowcaseMusic(deps)(ADMIN, {
      themeKey: 'xv-valeria',
      bytes: MP3,
      nombreArchivo: 'x.mp3',
      nombre: { track: ' Vals de Valeria ', artist: '' },
    })
    expect(JSON.parse(deps.filas['showcase.song.xv-valeria']!)).toEqual({ track: 'Vals de Valeria', artist: '' })
  })

  it('se cambia sin volver a subir, y solo en un modelo con canción', async () => {
    const deps = dobles()
    const sinCancion = await renameShowcaseSong(deps)(ADMIN, 'xv-valeria', { track: 'Vals', artist: '' })
    expect(isOk(sinCancion)).toBe(false)
    expect(deps.filas['showcase.song.xv-valeria']).toBeUndefined()

    await saveShowcaseMusic(deps)(ADMIN, { themeKey: 'xv-valeria', bytes: MP3, nombreArchivo: 'x.mp3' })
    const r = await renameShowcaseSong(deps)(ADMIN, 'xv-valeria', { track: 'Mi Vals', artist: 'Cuarteto' })
    expect(isOk(r)).toBe(true)
    expect(JSON.parse(deps.filas['showcase.song.xv-valeria']!)).toEqual({ track: 'Mi Vals', artist: 'Cuarteto' })
  })

  it('sin título no guarda, y una clave que no es modelo tampoco', async () => {
    const deps = dobles()
    await saveShowcaseMusic(deps)(ADMIN, { themeKey: 'xv-valeria', bytes: MP3, nombreArchivo: 'x.mp3' })
    expect(isOk(await renameShowcaseSong(deps)(ADMIN, 'xv-valeria', { track: '  ', artist: 'x' }))).toBe(false)
    expect(isOk(await renameShowcaseSong(deps)(ADMIN, 'payment.accountNumber', { track: 'x', artist: '' }))).toBe(false)
    expect(deps.filas['showcase.song.payment.accountNumber']).toBeUndefined()
  })
})
