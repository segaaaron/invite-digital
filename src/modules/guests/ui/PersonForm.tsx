'use client'

import { useActionState } from 'react'
import { addPersonAction, type PersonActionState } from '../actions'

export type GroupOption = { readonly id: string; readonly label: string; readonly free: number }

/**
 * Alta de una persona dentro de un grupo.
 *
 * El selector dice cuántos cupos quedan libres en cada grupo, y el servidor rechaza
 * pasarse igualmente: el cupo es lo prometido al invitado y lo que la puerta cuenta.
 */
export function PersonForm({ eventSlug, groups }: { eventSlug: string; groups: readonly GroupOption[] }) {
  const [state, action, pending] = useActionState<PersonActionState, FormData>(addPersonAction, { status: 'idle' })

  if (groups.length === 0) {
    return <p className="text-[13px] text-ink-mute">Crea primero un grupo; las personas van dentro de un grupo.</p>
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input name="eventSlug" type="hidden" value={eventSlug} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">Grupo</span>
          <select
            className="rounded-[14px] border border-line bg-bg-top/80 px-4 py-3 text-[14px] text-ink"
            name="guestGroupId"
            required
          >
            {groups.map((grupo) => (
              <option key={grupo.id} value={grupo.id}>
                {grupo.label} · {grupo.free} libre{grupo.free === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
            Nombre de la persona
          </span>
          <input
            className="rounded-[14px] border border-line bg-bg-top/80 px-4 py-3 text-[14px] text-ink"
            maxLength={160}
            name="fullName"
            placeholder="Ana Lucía Vega"
            required
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          Restricción alimentaria (opcional)
        </span>
        <input
          className="rounded-[14px] border border-line bg-bg-top/80 px-4 py-3 text-[14px] text-ink"
          name="dietaryNote"
          placeholder="Sin gluten, vegetariana, alergia a los frutos secos…"
        />
      </label>

      <div className="flex flex-wrap gap-5 text-[13px] text-ink-soft">
        <label className="flex items-center gap-2">
          <input name="isCompanion" type="checkbox" /> Es acompañante
        </label>
        <label className="flex items-center gap-2">
          <input name="vip" type="checkbox" /> VIP
        </label>
      </div>

      {state.status === 'error' ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          {state.message}
        </p>
      ) : null}

      <button
        className="w-fit rounded-full bg-gold px-5 py-2.5 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-white uppercase disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Añadiendo…' : '+ Añadir invitado'}
      </button>
    </form>
  )
}
