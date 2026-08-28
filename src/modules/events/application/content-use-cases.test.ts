import { describe, expect, it, vi } from 'vitest'
import type { InvitationContent } from '../domain/invitation-content'
import { contentFor, saveContentBlock, seedContentForTheme } from './content-use-cases'
import type { ContentRepository } from './ports'

const MUESTRA: InvitationContent = {
  quote: { text: 'De muestra' },
  music: { track: 'At Last', artist: 'Etta James' },
}

function repositorio(inicial: unknown = null) {
  let guardado = inicial
  const repo: ContentRepository = {
    find: vi.fn(async () => guardado),
    save: vi.fn(async (_id, blocks) => {
      guardado = blocks
    }),
    clear: vi.fn(async () => {
      guardado = {}
    }),
  }
  return { repo, leer: () => guardado }
}

describe('contentFor', () => {
  it('devuelve lo guardado, sin mezclarlo con la muestra del diseño', () => {
    // Fusionar aquí dejaría la invitación igual de completa, pero el atelier no podría
    // quitar una sección: la muestra volvería a asomar por debajo en cada apertura.
    const { repo } = repositorio({ music: { track: 'Perfect' } })
    return expect(contentFor(repo)('e1', MUESTRA)).resolves.toEqual({ music: { track: 'Perfect' } })
  })

  it('un bloque borrado se queda borrado', async () => {
    // LA prueba de esta decisión. Con la fusión en la lectura, borrar la canción la
    // devolvía en la siguiente apertura y el atelier no tenía forma de quitarla.
    const { repo } = repositorio(MUESTRA)

    await saveContentBlock(repo)('e1', 'music', null)

    expect(await contentFor(repo)('e1', MUESTRA)).toEqual({ quote: { text: 'De muestra' } })
  })

  it('no escribe al leer', async () => {
    // Una invitación popular se abre cientos de veces y ninguna de esas aperturas tiene
    // por qué dejar una escritura detrás.
    const { repo } = repositorio(MUESTRA)

    await contentFor(repo)('e1', MUESTRA)

    expect(repo.save).not.toHaveBeenCalled()
  })

  it('si la base no responde, pinta el contenido del diseño', async () => {
    // Que la base falle no puede dejar en blanco una invitación que alguien está mirando.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const repo: ContentRepository = {
      find: vi.fn(async () => {
        throw new Error('sin conexión')
      }),
      save: vi.fn(),
      clear: vi.fn(),
    }

    expect(await contentFor(repo)('e1', MUESTRA)).toEqual(MUESTRA)
  })
})

describe('seedContentForTheme', () => {
  it('escribe la muestra en un evento recién creado', async () => {
    const { repo, leer } = repositorio(null)

    await seedContentForTheme(repo)('e1', MUESTRA)

    expect(leer()).toEqual(MUESTRA)
  })

  it('no pisa lo que el atelier ya escribió', async () => {
    // Probar otro diseño no puede llevarse por delante el itinerario de una boda.
    const { repo, leer } = repositorio({ music: { track: 'Perfect', artist: 'Ed Sheeran' } })

    await seedContentForTheme(repo)('e1', MUESTRA)

    expect(leer()).toEqual({
      quote: { text: 'De muestra' },
      music: { track: 'Perfect', artist: 'Ed Sheeran' },
    })
  })
})

describe('saveContentBlock', () => {
  it('guarda un bloque sin tocar los demás', async () => {
    // Cambiar la canción no puede exigir volver a enviar el itinerario.
    const { repo, leer } = repositorio(MUESTRA)

    await saveContentBlock(repo)('e1', 'quote', { text: 'La nuestra' })

    expect(leer()).toEqual({
      quote: { text: 'La nuestra' },
      music: { track: 'At Last', artist: 'Etta James' },
    })
  })

  it('descarta lo que el dominio no admite, aunque llegue por la acción', async () => {
    const { repo, leer } = repositorio({})

    await saveContentBlock(repo)('e1', 'itinerary', 'no es una lista')

    expect(leer()).toEqual({})
  })
})

describe('el evento que nunca se sembró', () => {
  it('pinta la muestra del diseño, no una invitación en blanco', async () => {
    // Los eventos anteriores a esta tabla, los sembrados a mano y los de las pruebas no
    // tienen fila. Sin este caso, sus invitaciones saldrían con las ranuras y nada más.
    const { repo } = repositorio(null)

    expect(await contentFor(repo)('e1', MUESTRA)).toEqual(MUESTRA)
  })

  it('pero una fila vacía a propósito se respeta', async () => {
    // `null` es «nunca sembrado»; `{}` es «el atelier lo borró todo». Confundirlas dejaría
    // en blanco las invitaciones viejas o impediría vaciar las nuevas.
    const { repo } = repositorio({})

    expect(await contentFor(repo)('e1', MUESTRA)).toEqual({})
  })
})
