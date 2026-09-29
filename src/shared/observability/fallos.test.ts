import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { serviceFailures } from '@/shared/db/schema'
import { esCorteDelCliente, esFalloDelServicio, guardarFallo, huellaDe } from './fallos'
import { borrarTipoDeFallo, tiposDeFallo } from './lectura'

const SERVICIO = `prueba/${crypto.randomUUID().slice(0, 8)}`

afterAll(async () => {
  await db.delete(serviceFailures).where(eq(serviceFailures.service, SERVICIO))
})

describe('registro de fallos', () => {
  it('agrupa el mismo fallo aunque cambien los números, los identificadores y los correos', () => {
    expect(huellaDe('events/actions', 'No se pudo guardar el bloque map del evento 3f2a1b4c-1111-2222-3333-444455556666: tiempo 5000 ms')).toBe(
      huellaDe('events/actions', 'No se pudo guardar el bloque map del evento 9e8d7c6b-aaaa-bbbb-cccc-ddddeeeeffff: tiempo 30 ms'),
    )
    expect(huellaDe('a', 'mandar a ana@x.bo')).toBe(huellaDe('a', 'mandar a luis@y.com'))
    expect(huellaDe('a', 'uno')).not.toBe(huellaDe('b', 'uno'))
  })

  it('solo lo que se rompió: un rechazo de validación o un corte del navegador no llenan el registro', () => {
    expect(esFalloDelServicio(['alta de evento rechazada', 'deadline_after_event', 'La fecha límite no puede ser posterior al evento'])).toBe(false)
    expect(esFalloDelServicio(['inicio de sesión rechazado', 'invalid_credentials', 'Intento fallido para a@b.bo'])).toBe(false)
    expect(esFalloDelServicio(['alta de invitado rechazada', 'storage_failure', 'La base no responde'])).toBe(true)
    expect(esFalloDelServicio(['no se pudo avisar', new Error('x')])).toBe(true)
    expect(esCorteDelCliente(new Error('The destination stream closed early.'))).toBe(true)
    expect(esCorteDelCliente(new Error('relation does not exist'))).toBe(false)
  })

  it('guarda qué pasó (con los %s rellenados) y por qué (la pila y la causa), y el admin lo lee agrupado', async () => {
    const causa = new Error('conexión rechazada')
    const error = new Error('insert falló', { cause: causa })
    await guardarFallo({ servicio: SERVICIO, partes: ['No se pudo guardar el bloque %s:', 'reception', error], ruta: '/panel/eventos/x/configuracion', accion: 'abc' })
    await guardarFallo({ servicio: SERVICIO, partes: ['No se pudo guardar el bloque %s:', 'reception', error], ruta: null, accion: null })

    const tipo = (await tiposDeFallo(1, 'servidor')).find((t) => t.servicio === SERVICIO)
    expect(tipo).toMatchObject({ veces: 2, mensaje: 'No se pudo guardar el bloque reception: insert falló', origen: 'servidor' })
    expect(tipo!.detalle).toContain('insert falló')
    expect(tipo!.detalle).toContain('causado por: Error: conexión rechazada')

    expect(await borrarTipoDeFallo(tipo!.huella)).toBe(2)
    expect((await tiposDeFallo(1, null)).some((t) => t.servicio === SERVICIO)).toBe(false)
  })
})
