import { describe, expect, it } from 'vitest'
import { DAYS_BEFORE_DEADLINE, DAYS_UNOPENED, QUIET_DAYS, dueReminders, type ReminderCandidate } from './due'

const HOY = new Date('2026-09-25T12:00:00Z')
const CIERRE = new Date('2026-09-28T00:00:00Z')

function grupo(patch: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return {
    id: 'g1',
    label: 'Familia Rojas Peña',
    phone: '+59170011122',
    seats: 4,
    revoked: false,
    // Repartido hace diez días, abierto, y sin contestar.
    sentAt: new Date('2026-09-15T00:00:00Z'),
    openedAt: new Date('2026-09-15T01:00:00Z'),
    respondedAt: null,
    lastRemindedAt: {},
    ...patch,
  }
}

describe('dueReminders · sin respuesta', () => {
  it('lo saca cuando el cierre está dentro de la ventana', () => {
    const filas = dueReminders({ groups: [grupo()], deadline: CIERRE, today: HOY })

    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ groupId: 'g1', kind: 'sin_respuesta' })
  })

  it('no lo saca mientras el cierre esté lejos', () => {
    const lejos = new Date('2026-09-25T12:00:00Z')
    const cierreLejano = new Date(lejos.getTime() + (DAYS_BEFORE_DEADLINE + 1) * 86_400_000)

    expect(dueReminders({ groups: [grupo()], deadline: cierreLejano, today: lejos })).toEqual([])
  })

  it('el borde exacto de la ventana entra', () => {
    const cierreJusto = new Date(HOY.getTime() + DAYS_BEFORE_DEADLINE * 86_400_000)

    expect(dueReminders({ groups: [grupo()], deadline: cierreJusto, today: HOY })).toHaveLength(1)
  })

  it('quien ya contestó no se recuerda', () => {
    const contestado = grupo({ respondedAt: new Date('2026-09-20T00:00:00Z') })

    expect(dueReminders({ groups: [contestado], deadline: CIERRE, today: HOY })).toEqual([])
  })

  it('quien no tiene el enlace repartido tampoco: no hay nada que recordarle', () => {
    expect(dueReminders({ groups: [grupo({ sentAt: null })], deadline: CIERRE, today: HOY })).toEqual([])
  })

  it('un grupo revocado no genera recordatorios: revocar se deshace a propósito', () => {
    expect(dueReminders({ groups: [grupo({ revoked: true })], deadline: CIERRE, today: HOY })).toEqual([])
  })

  it('pasado el cierre ya no se recuerda: llegar tarde no lo arregla', () => {
    const pasado = new Date(CIERRE.getTime() + 86_400_000)

    expect(dueReminders({ groups: [grupo()], deadline: CIERRE, today: pasado })).toEqual([])
  })
})

describe('dueReminders · sin abrir', () => {
  const sinAbrir = (dias: number) =>
    grupo({
      openedAt: null,
      sentAt: new Date(HOY.getTime() - dias * 86_400_000),
    })

  it('lo saca cuando lleva días repartido y nadie lo abrió', () => {
    const filas = dueReminders({ groups: [sinAbrir(DAYS_UNOPENED)], deadline: CIERRE, today: HOY })

    // El motivo es «sin abrir», no «sin respuesta»: la acción no es insistir, es
    // averiguar si el mensaje llegó siquiera.
    expect(filas.map((f) => f.kind)).toEqual(['sin_abrir'])
  })

  it('no saca a nadie el mismo día en que se reparte el enlace, ni con el cierre encima', () => {
    // Ni siquiera por «sin respuesta»: escribir dos horas después de mandar la
    // invitación no es recordar, es meter prisa a quien no ha tenido ocasión de mirarla.
    expect(dueReminders({ groups: [sinAbrir(0)], deadline: CIERRE, today: HOY })).toEqual([])
  })

  it('sin abrir gana a sin respuesta: un grupo sale una sola vez', () => {
    // El mismo grupo cumple las dos condiciones. Sacarlo dos veces obligaría al atelier
    // a escribirle dos mensajes al mismo número la misma tarde.
    const ambas = sinAbrir(DAYS_UNOPENED + 5)

    expect(dueReminders({ groups: [ambas], deadline: CIERRE, today: HOY }).map((f) => f.kind)).toEqual(['sin_abrir'])
  })
})

describe('dueReminders · la espera entre recordatorios', () => {
  it('no repite el mismo motivo antes de la espera', () => {
    const ayer = grupo({ lastRemindedAt: { sin_respuesta: new Date(HOY.getTime() - 86_400_000) } })

    expect(dueReminders({ groups: [ayer], deadline: CIERRE, today: HOY })).toEqual([])
  })

  it('vuelve a salir cuando la espera se cumple', () => {
    const hace = grupo({ lastRemindedAt: { sin_respuesta: new Date(HOY.getTime() - QUIET_DAYS * 86_400_000) } })

    expect(dueReminders({ groups: [hace], deadline: CIERRE, today: HOY })).toHaveLength(1)
  })

  it('la espera es por motivo: haber avisado de uno no calla el otro', () => {
    const g = grupo({
      openedAt: null,
      sentAt: new Date(HOY.getTime() - (DAYS_UNOPENED + 1) * 86_400_000),
      lastRemindedAt: { sin_respuesta: HOY },
    })

    expect(dueReminders({ groups: [g], deadline: CIERRE, today: HOY }).map((f) => f.kind)).toEqual(['sin_abrir'])
  })
})

describe('dueReminders · lo que la fila lleva encima', () => {
  it('dice si el grupo no tiene teléfono, porque entonces no hay a quién escribirle', () => {
    const filas = dueReminders({ groups: [grupo({ phone: null })], deadline: CIERRE, today: HOY })

    expect(filas[0]).toMatchObject({ phone: null })
  })

  it('ordena por urgencia: primero lo que lleva más tiempo esperando', () => {
    const viejo = grupo({ id: 'viejo', openedAt: null, sentAt: new Date(HOY.getTime() - 20 * 86_400_000) })
    const nuevo = grupo({ id: 'nuevo', openedAt: null, sentAt: new Date(HOY.getTime() - 4 * 86_400_000) })

    const filas = dueReminders({ groups: [nuevo, viejo], deadline: CIERRE, today: HOY })

    expect(filas.map((f) => f.groupId)).toEqual(['viejo', 'nuevo'])
  })
})
