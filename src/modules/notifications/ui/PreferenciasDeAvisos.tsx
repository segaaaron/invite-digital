'use client'

import { useActionState } from 'react'
import { guardarPreferenciasAction, type PreferenciasState } from '@/app/_acciones/notifications/avisos-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: PreferenciasState = { status: 'idle' }

/** Qué avisos van a tus aparatos. Lo apagado se sigue viendo en la campana: silenciar no es perderlo. */
export function PreferenciasDeAvisos({ tipos, silenciados }: { tipos: readonly { tipo: string; titulo: string; ayuda: string }[]; silenciados: readonly string[] }) {
  const [estado, guardar] = useActionState(sinCaerse(guardarPreferenciasAction), INICIAL)
  return (
    // Casillas en rejilla, como la maqueta (E21); lo que hace cada una, al pasar por encima.
    <form action={guardar} className="flex flex-col gap-1">
      <div className="grid gap-x-6 gap-y-1 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
        {tipos.map((t) => (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]" key={t.tipo} title={t.ayuda}>
            <input className="size-5 shrink-0 accent-[var(--color-shell-deep)]" defaultChecked={!silenciados.includes(t.tipo)} name={`tipo:${t.tipo}`} type="checkbox" />
            {t.titulo}
          </label>
        ))}
      </div>
      {/* Qué interruptores había en pantalla: los demás tipos no se tocan al guardar. */}
      {tipos.map((t) => (
        <input key={`m-${t.tipo}`} name="mostrado" type="hidden" value={t.tipo} />
      ))}
      <div className="mt-3 flex items-center gap-3">
        <SubmitButton pendingLabel="Guardando…" variant="default">
          Guardar
        </SubmitButton>
        <ActionFeedback state={estado} />
      </div>
    </form>
  )
}
