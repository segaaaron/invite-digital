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
