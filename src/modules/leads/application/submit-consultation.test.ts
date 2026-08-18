import { describe, expect, it, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { Consultation } from '../domain/consultation'
import { submitConsultation } from './submit-consultation'

const clock = () => new Date('2026-08-18T12:00:00Z')

const payload = {
  name: 'María Rojas',
  email: 'maria@example.com',
  phone: '',
  categorySlug: 'boda',
  eventDate: '2026-12-05',
  message: 'Boda en Cochabamba',
  locale: 'es',
}

describe('submitConsultation', () => {
  it('guarda una consulta válida', async () => {
    const saved: Consultation[] = []
    const result = await submitConsultation({
      requests: {
        save: async (consultation) => {
          saved.push(consultation)
        },
      },
      clock,
    })(payload)

    expect(isOk(result)).toBe(true)
    expect(saved).toHaveLength(1)
    expect(saved[0]?.email).toBe('maria@example.com')
  })

  it('rechaza un payload con forma inválida sin tocar el repositorio', async () => {
    const save = vi.fn()
    const result = await submitConsultation({ requests: { save }, clock })({ name: 42 })

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_payload')
    expect(save).not.toHaveBeenCalled()
  })

  it('propaga el error del dominio sin tocar el repositorio', async () => {
    const save = vi.fn()
    const result = await submitConsultation({ requests: { save }, clock })({
      ...payload,
      email: '',
      phone: '',
    })

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('missing_contact')
    expect(save).not.toHaveBeenCalled()
  })

  it('convierte un fallo del repositorio en storage_failure', async () => {
    const result = await submitConsultation({
      requests: {
        save: async () => {
          throw new Error('conexión caída')
        },
      },
      clock,
    })(payload)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('storage_failure')
  })
})
