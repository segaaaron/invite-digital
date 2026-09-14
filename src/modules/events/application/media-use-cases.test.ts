import { describe, expect, it, vi } from 'vitest'
import { MAX_AUDIO_UPLOAD_BYTES } from '@/shared/audio/audio'
import { MAX_GUEST_PHOTOS, MAX_MEDIA_BYTES } from '../domain/media'
import { listGuestPhotos, purgeMedia, readMedia, saveGuestPhoto, saveMedia } from './media-use-cases'
import type { ImageProcessor, MediaRepository, MediaRow, MediaStorage } from './ports'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
/** Un MP3 con su etiqueta ID3 delante, que es como llega casi cualquiera. */
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0, 0, 0x02, 0x01, 7, 7, 7])
/** Lo que devuelve el procesador: otra imagen, más pequeña y en otro formato. */
const REENCODADA = new Uint8Array([0x52, 0x49, 0x46, 0x46, 9, 9, 9, 9, 0x57, 0x45, 0x42, 0x50])
/** Lo que devuelve `ffmpeg`: la canción convertida en un MP3 ajustado. */
const AJUSTADO = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 5, 5])
/** Una M4A del iPhone: `ffmpeg` la lee, `mediaTypeOf` no la reconoce. */
const M4A = new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20])
/** Lo que no es audio ni imagen: `ffmpeg` no sabe leerlo. */
const HTML = new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43])

function dobles(filas: MediaRow[] = []) {
  const disco = new Map<string, Uint8Array>()
  const media: MediaRepository = {
    insert: vi.fn(async (fila) => {
      filas.push(fila)
    }),
    find: vi.fn(async (id) => filas.find((fila) => fila.id === id) ?? null),
    listByEvent: vi.fn(async (eventId) => filas.filter((fila) => fila.eventId === eventId)),
    countByGroup: vi.fn(async (groupId) => filas.filter((fila) => fila.uploadedByGroupId === groupId).length),
    listByGroup: vi.fn(async (groupId) => filas.filter((fila) => fila.uploadedByGroupId === groupId)),
    remove: vi.fn(async (id) => {
      const indice = filas.findIndex((fila) => fila.id === id)
      if (indice >= 0) filas.splice(indice, 1)
    }),
  }
  const storage: MediaStorage = {
    put: vi.fn(async (key, bytes) => {
      disco.set(key, bytes)
    }),
    get: vi.fn(async (key) => disco.get(key) ?? null),
    remove: vi.fn(async (key) => {
      disco.delete(key)
    }),
  }
  // El procesador se comporta como el de verdad: devuelve otra imagen, en otro formato.
  const images: ImageProcessor = {
    normalize: vi.fn(async () => ({ bytes: REENCODADA, contentType: 'image/webp' as const })),
  }
  const audio = { normalize: vi.fn(async (bytes: Uint8Array) => (bytes === HTML ? null : AJUSTADO)) }
  return { media, storage, images, audio, disco, filas, ids: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }
}

describe('saveMedia', () => {
  it('rechaza por tamaño antes de leer el fichero', async () => {
    // Un arrayBuffer() de un archivo de dos gigas se los trae enteros al servidor antes de
    // que nadie lo rechace. Es la lección de los comprobantes del Plan B.
    const deps = dobles()
    const leer = vi.fn(async () => PNG)

    const salida = await saveMedia(deps)('e1', { name: 'enorme.png', size: MAX_AUDIO_UPLOAD_BYTES + 1, bytes: leer })

    expect(salida).toEqual({ ok: false, error: 'too_large' })
    expect(leer).not.toHaveBeenCalled()
    expect(deps.storage.put).not.toHaveBeenCalled()
  })

  it('una fotografía sigue topada en 8 MB aunque la puerta admita canciones de 30', async () => {
    const deps = dobles()

    const salida = await saveMedia(deps)('e1', { name: 'enorme.png', size: MAX_MEDIA_BYTES + 1, bytes: async () => PNG })

    expect(salida).toEqual({ ok: false, error: 'too_large' })
    expect(deps.images.normalize).not.toHaveBeenCalled()
  })

  it('la música se guarda ya ajustada por ffmpeg, no como llegó', async () => {
    // Quien sube la canción no tiene que saber recortarla ni comprimirla.
    const deps = dobles()

    const salida = await saveMedia(deps)('e1', { name: 'nuestra-cancion.mp3', size: MP3.length, bytes: async () => MP3 })

    expect(salida).toEqual({ ok: true, id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', contentType: 'audio/mpeg' })
    expect(deps.images.normalize).not.toHaveBeenCalled()
    expect(deps.disco.get('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.mp3')).toBe(AJUSTADO)
    expect(deps.filas[0]).toMatchObject({ contentType: 'audio/mpeg', originalName: 'nuestra-cancion.mp3', byteSize: AJUSTADO.length })
  })

  it('una M4A del iPhone también vale: sale convertida en MP3', async () => {
    const deps = dobles()

    const salida = await saveMedia(deps)('e1', { name: 'nota-de-voz.m4a', size: M4A.length, bytes: async () => M4A })

    expect(salida).toMatchObject({ ok: true, contentType: 'audio/mpeg' })
    expect(deps.audio.normalize).toHaveBeenCalledWith(M4A)
  })

  it('una canción pesada de más de 8 MB entra: el tope de la música es otro', async () => {
    const deps = dobles()

    const salida = await saveMedia(deps)('e1', { name: 'larga.wav', size: MAX_MEDIA_BYTES + 1, bytes: async () => MP3 })

    expect(salida).toMatchObject({ ok: true, contentType: 'audio/mpeg' })
  })

  it('una segunda canción reemplaza a la primera: queda una sola', async () => {
    // Una boda tiene UNA canción. Sin esto, cada cambio deja un MP3 muerto en el volumen y
    // una opción más en el selector, todas con nombres parecidos.
    const filas: MediaRow[] = []
    const deps = dobles(filas)
    await saveMedia(deps)('e1', { name: 'primera.mp3', size: MP3.length, bytes: async () => MP3 })

    const segundos = { ...deps, ids: () => 'ffffffff-1111-2222-3333-444444444444' }
    await saveMedia(segundos)('e1', { name: 'segunda.mp3', size: MP3.length, bytes: async () => MP3 })

    const audios = filas.filter((fila) => fila.contentType === 'audio/mpeg')
    expect(audios).toHaveLength(1)
    expect(audios[0]?.originalName).toBe('segunda.mp3')
    expect(deps.disco.has('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.mp3')).toBe(false)
  })

  it('pero las fotografías no se reemplazan entre sí', async () => {
    // De fotos una boda tiene muchas; de canción, una. Confundirlo borraría el álbum.
    const filas: MediaRow[] = []
    const deps = dobles(filas)
    await saveMedia(deps)('e1', { name: 'una.png', size: PNG.length, bytes: async () => PNG })

    const segunda = { ...deps, ids: () => 'ffffffff-1111-2222-3333-444444444444' }
    await saveMedia(segunda)('e1', { name: 'otra.png', size: PNG.length, bytes: async () => PNG })

    expect(filas).toHaveLength(2)
  })

  it('un invitado NO puede subir audio, aunque el formulario diga otra cosa', async () => {
    // El `accept` se cambia desde el navegador en dos segundos. Y como el audio reemplaza,
    // sin este corte cualquiera con el enlace dejaría muda la boda de otro.
    const deps = dobles()

    const salida = await saveGuestPhoto(deps)('e1', 'g1', {
      name: 'mi-cancion.mp3',
      size: MP3.length,
      bytes: async () => MP3,
    })

    expect(salida).toEqual({ ok: false, error: 'unsupported_type' })
    expect(deps.storage.put).not.toHaveBeenCalled()
  })

  it('sigue rechazando una canción que pasa del tope, antes de leerla', async () => {
    const deps = dobles()
    const leer = vi.fn(async () => MP3)

    const salida = await saveMedia(deps)('e1', { name: 'larga.mp3', size: MAX_AUDIO_UPLOAD_BYTES + 1, bytes: leer })

    expect(salida).toEqual({ ok: false, error: 'too_large' })
    expect(leer).not.toHaveBeenCalled()
  })

  it('rechaza lo que no es una imagen ni un audio, aunque se llame .png', async () => {
    const deps = dobles()

    const salida = await saveMedia(deps)('e1', { name: 'foto.png', size: 5, bytes: async () => HTML })

    expect(salida).toEqual({ ok: false, error: 'unsupported_type' })
    expect(deps.storage.put).not.toHaveBeenCalled()
  })

  it('guarda el fichero con nombre de identificador, no con el que llegó', async () => {
    const deps = dobles()

    const salida = await saveMedia(deps)('e1', {
      name: '../../etc/passwd',
      size: PNG.byteLength,
      bytes: async () => PNG,
    })

    expect(salida).toEqual({ ok: true, id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', contentType: 'image/webp' })
    expect([...deps.disco.keys()]).toEqual(['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp'])
  })

  it('conserva el nombre original solo para enseñarlo', async () => {
    const deps = dobles()
    await saveMedia(deps)('e1', { name: 'Retrato de Ana.png', size: PNG.byteLength, bytes: async () => PNG })

    expect(deps.filas[0]?.originalName).toBe('Retrato de Ana.png')
    // El tipo es el de lo que se guardó, no el de lo que llegó: se reencodó por el camino.
    expect(deps.filas[0]?.contentType).toBe('image/webp')
  })

  it('escribe el fichero antes que la fila', async () => {
    // Al revés, un fallo de disco dejaría una fila apuntando a una imagen que no existe, y
    // la invitación pintaría un hueco roto.
    const deps = dobles()
    const orden: string[] = []
    deps.storage.put = vi.fn(async () => {
      orden.push('disco')
    })
    deps.media.insert = vi.fn(async () => {
      orden.push('fila')
    })

    await saveMedia(deps)('e1', { name: 'a.png', size: PNG.byteLength, bytes: async () => PNG })

    expect(orden).toEqual(['disco', 'fila'])
  })

  it('guarda lo que devuelve el procesador, no lo que llegó', async () => {
    // Una fotografía de móvil ronda los cuatro megabytes y se sirve entera a un invitado
    // con datos. Se reencoda **antes** de guardarse, así que no hay una versión pesada
    // durmiendo en el disco a la espera de que alguien la pida.
    const deps = dobles()

    await saveMedia(deps)('e1', { name: 'foto.png', size: PNG.byteLength, bytes: async () => PNG })

    expect(deps.disco.get('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp')).toEqual(REENCODADA)
    expect(deps.filas[0]?.byteSize).toBe(REENCODADA.byteLength)
  })

  it('rechaza lo que el procesador no puede decodificar, aunque los primeros bytes cuadren', async () => {
    // Unos bytes de cabecera correctos y un cuerpo que no es una imagen pasan la primera
    // comprobación. Que no se pueda reencodar es la segunda, y la que decide.
    const deps = dobles()
    deps.images.normalize = vi.fn(async () => null)

    const salida = await saveMedia(deps)('e1', { name: 'rota.png', size: PNG.byteLength, bytes: async () => PNG })

    expect(salida).toEqual({ ok: false, error: 'unsupported_type' })
    expect(deps.storage.put).not.toHaveBeenCalled()
  })

  it('no llama al procesador con un fichero que ya se rechazó por tamaño', async () => {
    const deps = dobles()

    await saveMedia(deps)('e1', { name: 'enorme.png', size: MAX_MEDIA_BYTES + 1, bytes: async () => PNG })

    expect(deps.images.normalize).not.toHaveBeenCalled()
  })

  it('devuelve el fallo en vez de lanzarlo cuando el disco no responde', async () => {
    const deps = dobles()
    deps.storage.put = vi.fn(async () => {
      throw new Error('disco lleno')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const salida = await saveMedia(deps)('e1', { name: 'a.png', size: PNG.byteLength, bytes: async () => PNG })

    expect(salida).toEqual({ ok: false, error: 'storage_failure' })
  })
})

describe('readMedia', () => {
  it('devuelve la imagen y a qué evento pertenece', async () => {
    // El evento importa: la ruta que la sirve necesita saber a cuál para aplicarle su
    // puerta de contraseña.
    const deps = dobles()
    await saveMedia(deps)('e1', { name: 'a.png', size: PNG.byteLength, bytes: async () => PNG })

    const salida = await readMedia(deps)('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')

    expect(salida?.eventId).toBe('e1')
    expect(salida?.contentType).toBe('image/webp')
  })

  it('un identificador desconocido devuelve nada, no revienta', async () => {
    expect(await readMedia(dobles())('no-existe')).toBeNull()
  })

  it('una fila sin fichero en disco devuelve nada', async () => {
    // Puede pasar si la retención barrió el disco antes que la base.
    const deps = dobles([
      { id: 'x', eventId: 'e1', contentType: 'image/png', originalName: 'a.png', byteSize: 10, uploadedByGroupId: null },
    ])
    expect(await readMedia(deps)('x')).toBeNull()
  })
})

describe('purgeMedia', () => {
  it('borra el fichero y la fila de todas las imágenes del evento', async () => {
    const deps = dobles()
    await saveMedia(deps)('e1', { name: 'a.png', size: PNG.byteLength, bytes: async () => PNG })

    const borradas = await purgeMedia(deps)('e1')

    expect(borradas).toBe(1)
    expect(deps.disco.size).toBe(0)
    expect(deps.filas).toHaveLength(0)
  })

  it('no toca las imágenes de otro evento', async () => {
    const filas: MediaRow[] = [
      { id: 'otra', eventId: 'e2', contentType: 'image/png', originalName: 'b.png', byteSize: 10, uploadedByGroupId: null },
    ]
    const deps = dobles(filas)

    await purgeMedia(deps)('e1')

    expect(filas).toHaveLength(1)
  })
})

describe('saveGuestPhoto', () => {
  const foto = () => ({ name: 'boda.png', size: PNG.byteLength, bytes: async () => PNG })

  it('deja la procedencia dentro, para poder contarla y distinguirla', async () => {
    const deps = dobles()

    const salida = await saveGuestPhoto(deps)('e1', 'g1', foto())

    expect(salida).toEqual({ ok: true, id: expect.any(String), contentType: 'image/webp' })
    expect(deps.filas[0]?.uploadedByGroupId).toBe('g1')
  })

  it('corta en el tope del grupo, no en el del evento', async () => {
    // El extremo no tiene sesión: se autoriza con el token del enlace, y ese enlace circula
    // por WhatsApp. Sin tope, quien lo tenga llena el disco a ocho megabytes por vez.
    const filas: MediaRow[] = Array.from({ length: MAX_GUEST_PHOTOS }, (_, i) => ({
      id: `f${i}`,
      eventId: 'e1',
      contentType: 'image/webp',
      originalName: 'x.webp',
      byteSize: 10,
      uploadedByGroupId: 'g1',
    }))
    const deps = dobles(filas)

    expect(await saveGuestPhoto(deps)('e1', 'g1', foto())).toEqual({ ok: false, error: 'too_many' })
    // Otro grupo sigue pudiendo: contarlo por evento dejaría al primero sin sitio para el resto.
    expect(await saveGuestPhoto(deps)('e1', 'g2', foto())).toEqual({ ok: true, id: expect.any(String), contentType: 'image/webp' })
  })

  it('el invitado ve solo las suyas', async () => {
    const deps = dobles()
    await saveGuestPhoto(deps)('e1', 'g1', foto())
    await saveMedia(deps)('e1', foto())

    expect(await listGuestPhotos(deps)('g1')).toHaveLength(1)
  })
})
