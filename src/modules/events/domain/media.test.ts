import { describe, expect, it } from 'vitest'
import { MAX_MEDIA_BYTES, displayNameOf, extensionFor, mediaTypeOf, storageKeyFor } from './media'

const bytes = (...valores: number[]) => new Uint8Array(valores)
const ftyp = (marca: string) =>
  bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, ...[...marca].map((letra) => letra.charCodeAt(0)))

describe('mediaTypeOf', () => {
  it('reconoce PNG', () => {
    expect(mediaTypeOf(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png')
  })

  it('reconoce JPEG', () => {
    expect(mediaTypeOf(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
  })

  it('reconoce WEBP mirando el byte 8, no solo RIFF', () => {
    expect(mediaTypeOf(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe('image/webp')
  })

  it('no toma por WEBP un WAV ni un AVI', () => {
    // `RIFF` lo comparten WAV y AVI. Es la lección de los comprobantes del Plan B.
    expect(mediaTypeOf(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45))).toBeNull()
    expect(mediaTypeOf(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20))).toBeNull()
  })

  it('reconoce AVIF por la marca de su caja, no solo por ftyp', () => {
    expect(mediaTypeOf(ftyp('avif'))).toBe('image/avif')
    expect(mediaTypeOf(ftyp('avis'))).toBe('image/avif')
  })

  it('no toma por AVIF un MP4, un HEIC ni un MOV', () => {
    // La caja `ftyp` la comparten todos los contenedores ISO-BMFF. Un vídeo de dos gigas
    // aceptado como imagen es un fichero que nadie va a poder pintar y que ya se guardó.
    expect(mediaTypeOf(ftyp('mp42'))).toBeNull()
    expect(mediaTypeOf(ftyp('heic'))).toBeNull()
    expect(mediaTypeOf(ftyp('qt  '))).toBeNull()
  })

  it('reconoce un MP3 con etiqueta ID3 delante', () => {
    // Casi todo MP3 que sale de un móvil o de una descarga empieza por su etiqueta ID3,
    // no por la primera trama: dentro van el título, el artista y a veces la carátula.
    expect(mediaTypeOf(bytes(0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0, 0, 0x02, 0x01))).toBe('audio/mpeg')
  })

  it('reconoce un MP3 que empieza directamente por una trama', () => {
    // Sincronismo de trama: once bits a uno. `0xFB` y `0xF3` son MPEG-1 capa III, que es
    // lo que todo el mundo llama «mp3»; `0xE0` es el mínimo que cumple el sincronismo.
    expect(mediaTypeOf(bytes(0xff, 0xfb, 0x90, 0x00))).toBe('audio/mpeg')
    expect(mediaTypeOf(bytes(0xff, 0xf3, 0x48, 0x00))).toBe('audio/mpeg')
    expect(mediaTypeOf(bytes(0xff, 0xe0, 0x00, 0x00))).toBe('audio/mpeg')
  })

  it('no confunde un JPEG con un MP3, y el orden es lo único que lo impide', () => {
    // Los dos empiezan por `0xFF`. Un JPEG sigue con `0xD8`, que **no** cumple el
    // sincronismo —`0xD8 & 0xE0` es `0xC0`—, pero si algún día se relajara esa máscara,
    // toda fotografía entraría como audio y se serviría como tal.
    expect(mediaTypeOf(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
  })

  it('no toma por MP3 un WAV, aunque sea audio', () => {
    // Se admite **una** cosa: MP3. Es el único formato que reproducen todos los
    // navegadores sin excepción, y un WAV de un minuto pesa diez megabytes.
    expect(mediaTypeOf(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45))).toBeNull()
  })

  it('rechaza lo que no reconoce', () => {
    // Un HTML con un `<script>` dentro llamado `foto.png`, servido desde nuestro origen,
    // es exactamente el agujero que esto cierra.
    expect(mediaTypeOf(bytes(0x3c, 0x21, 0x44, 0x4f, 0x43))).toBeNull()
    expect(mediaTypeOf(bytes(0x25, 0x50, 0x44, 0x46))).toBeNull()
    expect(mediaTypeOf(bytes())).toBeNull()
  })
})

describe('storageKeyFor', () => {
  it('nombra el fichero por su identificador, nunca por el nombre que llegó', () => {
    // Componer una ruta con el nombre original sería dejar que quien sube elija dónde se
    // escribe.
    expect(storageKeyFor('11111111-2222-3333-4444-555555555555', 'image/jpeg')).toBe(
      '11111111-2222-3333-4444-555555555555.jpg',
    )
  })

  it('da la extensión del tipo real, no la del nombre', () => {
    expect(extensionFor('image/png')).toBe('png')
    expect(extensionFor('image/avif')).toBe('avif')
    expect(extensionFor('audio/mpeg')).toBe('mp3')
  })

  it('nombra el audio por su identificador, igual que una imagen', () => {
    expect(storageKeyFor('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'audio/mpeg')).toBe(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.mp3',
    )
  })
})

describe('displayNameOf', () => {
  it('conserva el nombre para enseñarlo', () => {
    expect(displayNameOf('  Retrato de Ana.jpg ')).toBe('Retrato de Ana.jpg')
  })

  it('no deja el nombre vacío', () => {
    expect(displayNameOf('   ')).toBe('imagen')
  })

  it('no se usa para componer rutas, y por eso un nombre hostil no importa', () => {
    // Se conserva tal cual porque solo se enseña. Lo que protege es `storageKeyFor`.
    expect(displayNameOf('../../etc/passwd')).toBe('../../etc/passwd')
    expect(storageKeyFor('abc', 'image/png')).toBe('abc.png')
  })
})

describe('el tope de tamaño', () => {
  it('son ocho megabytes', () => {
    // Se comprueba antes de leer el fichero a memoria: un arrayBuffer() de dos gigas se
    // los trae enteros al servidor antes de que nadie lo rechace.
    expect(MAX_MEDIA_BYTES).toBe(8 * 1024 * 1024)
  })
})
