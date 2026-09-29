'use client'

import { useActionState } from 'react'
import { guardarPreferenciasAction, type PreferenciasState } from '@/app/_acciones/notifications/avisos-actions'
import { SwitchRow } from '@/shared/design/ui/panel/ajustes'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: PreferenciasState = { status: 'idle' }

/** Qué avisos van a tus aparatos. Lo apagado se sigue viendo en la campana: silenciar no es perderlo. */
export function PreferenciasDeAvisos({ tipos, silenciados }: { tipos: readonly { tipo: string; titulo: string; ayuda: string }[]; silenciados: readonly string[] }) {
  const [estado, guardar] = useActionState(guardarPreferenciasAction, INICIAL)
  return (
    <form action={guardar} className="flex flex-col gap-1">
      {tipos.map((t) => (
        <SwitchRow defaultChecked={!silenciados.includes(t.tipo)} description={t.ayuda} key={t.tipo} label={t.titulo} name={`tipo:${t.tipo}`} />
      ))}
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
