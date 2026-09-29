import { describe, expect, it } from 'vitest'
import { avisoDeRespuesta, avisoDeVenta, type CargaPush } from '../domain/avisos'
import { avisarAlAdmin, avisarDelEvento, type AparatoPush, type AvisosStore, type EmisorPush } from './avisos'

function dobles(aparatos: AparatoPush[], resultado: (a: AparatoPush) => 'ok' | 'caducada' | 'error' = () => 'ok') {
  const creados: { userId: string; eventId: string | null; title: string }[] = []
  const enviados: { endpoint: string; carga: CargaPush }[] = []
  const olvidados: string[] = []
  const store: AvisosStore = {
    async delEvento(eventId) {
      return eventId === 'e1'
        ? {
            titulo: 'Boda de Ana y Luis',
            slug: 'boda-ana',
            dueno: { userId: 'atelier', role: 'atelier' },
            equipo: [
              { userId: 'novia', role: 'cliente', membership: 'cliente' },
              { userId: 'puerta', role: 'puerta', membership: 'puerta' },
            ],
          }
        : null
    },
    async admins() {
      return ['admin1']
    },
    async crear(filas) {
      for (const f of filas) creados.push({ userId: f.userId, eventId: f.eventId, title: f.aviso.title })
    },
    async aparatosDe(userIds) {
      return aparatos.filter((a) => userIds.includes(a.userId))
    },
    async olvidarAparato(id) {
      olvidados.push(id)
    },
    async aparatoUsado() {},
    async yaAvisado(_eventId, titulo) {
      return creados.some((c) => c.title === titulo)
    },
  }
  const emisor: EmisorPush = {
    disponible: true,
    async enviar(aparato, carga) {
      enviados.push({ endpoint: aparato.endpoint, carga })
      return resultado(aparato)
    },
  }
  return { store, emisor, creados, enviados, olvidados }
}

const aparato = (id: string, userId: string, silenciados: string[] = []): AparatoPush => ({ id, userId, endpoint: `https://push/${id}`, p256dh: 'k', auth: 'a', silenciados })

describe('avisarDelEvento', () => {
  it('guarda el aviso para cada destinatario y lo manda a cada uno de sus aparatos', async () => {
    const d = dobles([aparato('a1', 'novia'), aparato('a2', 'novia'), aparato('a3', 'atelier'), aparato('a4', 'puerta')])
    await avisarDelEvento(d)('e1', (ev) => avisoDeRespuesta({ ...ev, invitado: 'Ramón', lugares: 2 }))
    expect(d.creados).toEqual([
      { userId: 'atelier', eventId: 'e1', title: 'Ramón confirmó 2 lugares' },
      { userId: 'novia', eventId: 'e1', title: 'Ramón confirmó 2 lugares' },
    ])
    // La recepción no recibe nada; la novia en sus dos aparatos.
    expect(d.enviados.map((e) => e.endpoint).sort()).toEqual(['https://push/a1', 'https://push/a2', 'https://push/a3'])
    expect(d.enviados[0]?.carga.tag).toBe('rsvp:e1')
  })

  it('lo silenciado queda en la campana pero no va al aparato', async () => {
    const d = dobles([aparato('a1', 'novia', ['rsvp']), aparato('a3', 'atelier')])
    await avisarDelEvento(d)('e1', (ev) => avisoDeRespuesta({ ...ev, invitado: 'Ramón', lugares: 2 }))
    expect(d.creados).toHaveLength(2)
    expect(d.enviados.map((e) => e.endpoint)).toEqual(['https://push/a3'])
  })

  it('un aparato que ya no existe (404/410) se olvida; un error pasajero, no', async () => {
    const d = dobles([aparato('muerto', 'novia'), aparato('lento', 'atelier')], (a) => (a.id === 'muerto' ? 'caducada' : 'error'))
    await avisarDelEvento(d)('e1', (ev) => avisoDeRespuesta({ ...ev, invitado: 'Ramón', lugares: 2 }))
    expect(d.olvidados).toEqual(['muerto'])
  })

  it('sin claves de push guarda la campana igual; un evento que no existe no hace nada; nunca lanza', async () => {
    const d = dobles([aparato('a1', 'novia')])
    await avisarDelEvento({ ...d, emisor: { ...d.emisor, disponible: false } })('e1', (ev) => avisoDeRespuesta({ ...ev, invitado: 'R', lugares: 1 }))
    expect(d.creados).toHaveLength(2)
    expect(d.enviados).toHaveLength(0)
    await avisarDelEvento(d)('otro', (ev) => avisoDeRespuesta({ ...ev, invitado: 'R', lugares: 1 }))
    expect(d.creados).toHaveLength(2)
    const roto = { ...d, store: { ...d.store, delEvento: async () => Promise.reject(new Error('base caída')) } }
    await expect(avisarDelEvento(roto)('e1', (ev) => avisoDeRespuesta({ ...ev, invitado: 'R', lugares: 1 }))).resolves.toBe(false)
  })

  it('«una vez al día» no repite el mismo aviso si el mantenimiento corre dos veces', async () => {
    const d = dobles([])
    const construir = (ev: { titulo: string; slug: string }) => avisoDeRespuesta({ ...ev, invitado: 'R', lugares: 1 })
    expect(await avisarDelEvento(d)('e1', construir, { unaVezAlDia: true })).toBe(true)
    expect(await avisarDelEvento(d)('e1', construir, { unaVezAlDia: true })).toBe(false)
    expect(d.creados).toHaveLength(2)
  })
})

describe('avisarAlAdmin', () => {
  it('le llega a cada admin, sin evento', async () => {
    const d = dobles([aparato('a9', 'admin1')])
    await avisarAlAdmin(d)(avisoDeVenta({ titulo: 'Nueva consulta de Carla', detalle: '', ruta: '/panel/admin/ventas' }))
    expect(d.creados).toEqual([{ userId: 'admin1', eventId: null, title: 'Nueva consulta de Carla' }])
    expect(d.enviados[0]?.carga).toEqual({ title: 'Nueva consulta de Carla', body: '', url: '/panel/admin/ventas', tag: 'venta' })
  })
})
