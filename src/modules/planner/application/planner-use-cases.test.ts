import { describe, expect, it } from 'vitest'
import type { Partida } from '../domain/presupuesto'
import type { Tarea } from '../domain/tareas'
import { addPayment, addTask, editTask, moveTask, saveItem, seedTasks, toggleTask } from './planner-use-cases'
import type { PlannerStore } from './ports'

/** Un almacén en memoria que respeta el evento como el de verdad. */
function memoria() {
  const tareas: Array<Tarea & { eventId: string }> = []
  const partidas: Array<Partida & { eventId: string }> = []
  let n = 0
  const store: PlannerStore = {
    listTasks: async (e) => tareas.filter((t) => t.eventId === e).sort((a, b) => a.sortOrder - b.sortOrder),
    insertTasks: async (e, nuevas) => {
      for (const t of nuevas) tareas.push({ ...t, id: `t${++n}`, eventId: e, notes: null, doneAt: null, doneBy: null })
    },
    updateTask: async (e, id, patch) => {
      const i = tareas.findIndex((t) => t.id === id && t.eventId === e)
      if (i < 0) return false
      tareas[i] = { ...tareas[i]!, ...patch }
      return true
    },
    removeTask: async () => true,
    listBudget: async (e) => partidas.filter((p) => p.eventId === e),
    insertItem: async (e, item) => {
      const id = `p${++n}`
      partidas.push({ ...item, id, eventId: e, pagos: [] })
      return id
    },
    updateItem: async () => true,
    removeItem: async () => true,
    insertPayment: async (e, itemId, pago) => {
      const p = partidas.find((x) => x.id === itemId && x.eventId === e)
      if (!p) return false
      ;(p.pagos as unknown as object[]).push({ id: `g${++n}`, ...pago, paidAt: null })
      return true
    },
    setPaymentPaid: async () => true,
    removePayment: async () => true,
  }
  return { store, tareas, partidas, clock: () => new Date('2027-01-10T15:00:00.000Z') }
}

describe('tareas', () => {
  it('sembrar con la fiesta encima no deja nada vencido: lo que ya pasó vence hoy', async () => {
    const deps = memoria()
    await seedTasks(deps)('e1', 'xv', '2027-02-10')
    expect(deps.tareas.every((t) => t.dueDate !== null && t.dueDate >= '2027-01-10')).toBe(true)
  })

  it('sembrar dos veces no duplica la plantilla', async () => {
    const deps = memoria()
    await seedTasks(deps)('e1', 'boda', '2027-05-15')
    const cuantas = deps.tareas.length
    expect(await seedTasks(deps)('e1', 'boda', '2027-05-15')).toEqual({ ok: true, creadas: 0 })
    expect(deps.tareas).toHaveLength(cuantas)
  })

  it('una tarea propia va al final y valida título, etapa y fecha', async () => {
    const deps = memoria()
    await seedTasks(deps)('e1', 'xv', '2027-05-15')
    const ultima = Math.max(...deps.tareas.map((t) => t.sortOrder))

    expect(await addTask(deps)('e1', 'xv', { title: '  ', stage: 'm6', dueDate: '', assignee: 'anfitrion' })).toMatchObject({ ok: false })
    expect(await addTask(deps)('e1', 'xv', { title: 'Probar peinado', stage: 'm1', dueDate: '', assignee: 'anfitrion' })).toMatchObject({ ok: false })
    expect(await addTask(deps)('e1', 'xv', { title: 'Probar peinado', stage: 'm6', dueDate: '2027-02-30', assignee: 'anfitrion' })).toMatchObject({ ok: false })
    expect(await addTask(deps)('e1', 'xv', { title: 'Probar peinado', stage: 'propias', dueDate: '', assignee: 'planner' })).toEqual({ ok: true })

    expect(deps.tareas.at(-1)).toMatchObject({ title: 'Probar peinado', sortOrder: ultima + 1, dueDate: null, assignee: 'planner' })
  })

  it('marcarla guarda cuándo y quién; desmarcarla lo borra', async () => {
    const deps = memoria()
    await seedTasks(deps)('e1', 'boda', '2027-05-15')
    const id = deps.tareas[0]!.id

    await toggleTask(deps)('e1', id, 'ana@ejemplo.bo')
    expect(deps.tareas[0]).toMatchObject({ doneBy: 'ana@ejemplo.bo', doneAt: new Date('2027-01-10T15:00:00.000Z') })
    await toggleTask(deps)('e1', id, 'ana@ejemplo.bo')
    expect(deps.tareas[0]).toMatchObject({ doneBy: null, doneAt: null })
  })

  it('de otro evento, no existe', async () => {
    const deps = memoria()
    await seedTasks(deps)('e1', 'boda', '2027-05-15')
    expect(await toggleTask(deps)('e2', deps.tareas[0]!.id, 'x@y.bo')).toMatchObject({ ok: false })
    expect(await editTask(deps)('e2', 'boda', deps.tareas[0]!.id, { title: 'x', stage: 'm12', dueDate: '', assignee: 'anfitrion', notes: '' })).toMatchObject({ ok: false })
  })

  it('subir una tarea la cambia con la anterior de su etapa; la primera no sube', async () => {
    const deps = memoria()
    await seedTasks(deps)('e1', 'boda', '2027-05-15')
    const [primera, segunda] = deps.tareas.filter((t) => t.stage === 'm12')

    await moveTask(deps)('e1', segunda!.id, 'arriba')
    const orden = (await deps.store.listTasks('e1')).filter((t) => t.stage === 'm12').map((t) => t.id)
    expect(orden.slice(0, 2)).toEqual([segunda!.id, primera!.id])

    expect(await moveTask(deps)('e1', segunda!.id, 'arriba')).toEqual({ ok: true })
    expect((await deps.store.listTasks('e1')).filter((t) => t.stage === 'm12')[0]?.id).toBe(segunda!.id)
  })
})

describe('presupuesto', () => {
  const item = { category: 'salon', concept: 'Salón', estimatedCents: 100_00, contractedCents: null, payer: 'anfitriones' as const, padrinoLabel: '', notes: '' }

  it('valida concepto, categoría de su fiesta e importes', async () => {
    const deps = memoria()
    expect(await saveItem(deps)('e1', 'boda', null, { ...item, concept: '' })).toMatchObject({ ok: false })
    expect(await saveItem(deps)('e1', 'boda', null, { ...item, category: 'chambelanes' })).toMatchObject({ ok: false })
    expect(await saveItem(deps)('e1', 'boda', null, { ...item, estimatedCents: -1 })).toMatchObject({ ok: false })
    expect(await saveItem(deps)('e1', 'boda', null, item)).toEqual({ ok: true })
  })

  it('el nombre del padrino solo se guarda si paga un padrino', async () => {
    const deps = memoria()
    await saveItem(deps)('e1', 'boda', null, { ...item, padrinoLabel: 'Tío Jorge' })
    await saveItem(deps)('e1', 'boda', null, { ...item, payer: 'padrino', padrinoLabel: '  Tío Jorge ' })
    expect(deps.partidas.map((p) => p.padrinoLabel)).toEqual([null, 'Tío Jorge'])
  })

  it('un pago necesita importe mayor que cero y una partida de este evento', async () => {
    const deps = memoria()
    await saveItem(deps)('e1', 'boda', null, item)
    const id = deps.partidas[0]!.id
    expect(await addPayment(deps)('e1', id, { amountCents: 0, dueDate: '', label: '' })).toMatchObject({ ok: false })
    expect(await addPayment(deps)('e2', id, { amountCents: 10, dueDate: '', label: '' })).toMatchObject({ ok: false })
    expect(await addPayment(deps)('e1', id, { amountCents: 10, dueDate: '2027-02-01', label: 'propina' })).toMatchObject({ ok: false })
    expect(await addPayment(deps)('e1', id, { amountCents: 10, dueDate: '2027-02-01', label: 'anticipo' })).toEqual({ ok: true })
    expect(deps.partidas[0]?.pagos[0]).toMatchObject({ label: 'anticipo' })
  })
})
