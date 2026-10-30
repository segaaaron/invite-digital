import { describe, expect, it } from 'vitest'
import { isOk } from '@/shared/result'
import { submitConsultation } from './submit-consultation'
import type { Consultation } from '../domain/consultation'
import { consultaDelSobre } from '../domain/consulta-del-sobre'

const SOBRE = {
  nombres: 'María Rojas',
  tel: '+591 748 17280',
  fecha: '2027-06-12',
  mensaje: 'Hola, somos María Rojas. Celebramos una boda el 12 de junio de 2027. Nos interesa el plan Atelier · Bs 2.400. Mi teléfono: +591 748 17280',
  locale: 'es',
} as const

/**
 * La prueba que sujeta el sobre: si los campos dejan de llamarse como el esquema espera, la
 * consulta se rechaza con `invalid_payload`, el cliente ve WhatsApp abrirse igual y en Ventas no
 * aparece nadie. Por eso se comprueba contra el caso de uso de verdad, no contra la forma.
 */
describe('consultaDelSobre', () => {
  it('arma una consulta que el caso de uso guarda', async () => {
    const guardadas: Consultation[] = []
    const resultado = await submitConsultation({
      requests: {
        save: async (consulta) => {
          guardadas.push(consulta)
        },
      },
      clock: () => new Date('2026-10-30T12:00:00Z'),
    })(consultaDelSobre(SOBRE))

    expect(isOk(resultado)).toBe(true)
    expect(guardadas[0]?.name).toBe('María Rojas')
    // El teléfono es el único camino de vuelta: el sobre no pide correo.
    expect(guardadas[0]?.phone).toBe('+59174817280')
    expect(guardadas[0]?.email).toBeNull()
    expect(guardadas[0]?.eventDate).toBe('2027-06-12')
    expect(guardadas[0]?.message).toBe(SOBRE.mensaje)
  })
})
