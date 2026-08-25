import { describe, expect, it } from 'vitest'
import { importGuestGroups } from './import-guest-groups'
import type { GuestGroupRepository } from './ports'
import { isOk } from '@/shared/result'

function repo() {
  const insertados: string[] = []
  const telefonos: Array<string | null> = []
  const groups: GuestGroupRepository = {
    insert: async (group) => void insertados.push(group.label),
    listByEvent: async () => [],
    findByTokenHash: async () => null,
    findById: async () => null,
    revoke: async () => {},
    markOpened: async () => {},
    markSent: async () => {},
    replaceToken: async () => {},
    setPhone: async (_id, phone) => void telefonos.push(phone),
  }
  return { groups, insertados, telefonos }
}

let contador = 0
const minter = {
  mint: () => ({ token: `t${++contador}`, hash: Buffer.alloc(32, contador) }),
  hashOf: (token: string) => Buffer.alloc(32, token.length),
}
const ids = () => `id${contador}`

describe('importGuestGroups', () => {
  it('crea las filas buenas y devuelve el enlace de cada una', async () => {
    const { groups, insertados, telefonos } = repo()
    const importar = importGuestGroups({ groups, minter, ids, clock: () => new Date('2026-08-24T12:00:00Z') })

    const result = await importar({
      eventId: 'e1',
      csv: 'Grupo;Cupos;Teléfono\nFamilia Rojas;4;+59170011122\nAna Vega;2;',
      allowance: { maxGuestGroups: null },
      currentGroups: 0,
    })

    expect(isOk(result) && result.value.created).toBe(2)
    expect(insertados).toEqual(['Familia Rojas', 'Ana Vega'])
    expect(telefonos).toEqual(['+59170011122'])
    expect(isOk(result) && result.value.rows.every((f) => f.token !== null)).toBe(true)
  })

  it('las filas malas salen en el informe con su motivo, y no cortan la importación', async () => {
    const { groups, insertados } = repo()
    const result = await importGuestGroups({ groups, minter, ids, clock: () => new Date('2026-08-24T12:00:00Z') })({
      eventId: 'e1',
      csv: 'Familia Rojas;4\n;3\nAna Vega;2',
      allowance: { maxGuestGroups: null },
      currentGroups: 0,
    })

    expect(isOk(result) && result.value.created).toBe(2)
    expect(isOk(result) && result.value.rejected).toBe(1)
    expect(insertados).toEqual(['Familia Rojas', 'Ana Vega'])
  })

  it('al llegar al tope del plan, lo creado se queda y el resto se rechaza con su motivo', async () => {
    // Deshacerlo todo por culpa de la fila que no cabe obligaría a repetir el trabajo
    // entero; y el tope del plan es del servidor, no del formulario.
    const { groups, insertados } = repo()
    const result = await importGuestGroups({ groups, minter, ids, clock: () => new Date('2026-08-24T12:00:00Z') })({
      eventId: 'e1',
      csv: 'Uno;2\nDos;2\nTres;2',
      allowance: { maxGuestGroups: 2 },
      currentGroups: 0,
    })

    expect(insertados).toEqual(['Uno', 'Dos'])
    expect(isOk(result) && result.value.created).toBe(2)
    expect(isOk(result) && result.value.rows[2]?.problem).toContain('plan admite 2')
  })
})
