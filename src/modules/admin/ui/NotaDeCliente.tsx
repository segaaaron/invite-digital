'use client'

import { useActionState, useId } from 'react'
import { guardarNotaClienteAction, publicarOpinionAction, type ClienteActionState } from '@/app/_acciones/admin/clientes-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: ClienteActionState = { status: 'idle' }

/**
 * **Lo que el admin sabe de esta persona y no está en ninguna tabla**: sus etiquetas (VIP,
 * Recomendado, Presupuesto alto…) y una nota libre («prefiere tonos lila», «llamar después del 15»).
 * Se marca de un toque y se guarda con un botón.
 */
export function NotaDeCliente({ clave, nombre, nota, etiquetas, sugeridas }: { clave: string; nombre: string; nota: string | null; etiquetas: readonly string[]; sugeridas: readonly string[] }) {
  const [estado, guardar] = useActionState(sinCaerse(guardarNotaClienteAction), INICIAL)
  const id = useId()
  const todas = [...new Set([...sugeridas, ...etiquetas])]
  return (
    <form action={guardar} className="flex flex-col gap-3">
      <input name="clave" type="hidden" value={clave} />
      <input name="nombre" type="hidden" value={nombre} />
      <fieldset>
        <legend className={`${LABEL_CLASS} mb-2`}>Etiquetas</legend>
        <div className="flex flex-wrap gap-1.5">
          {todas.map((t) => (
            <label
              className="cursor-pointer rounded-full border border-line-panel bg-white px-3 py-1 text-[12px] text-ink-soft transition-colors has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white"
              key={t}
            >
              <input className="sr-only" defaultChecked={etiquetas.includes(t)} name="etiqueta" type="checkbox" value={t} />
              {t}
            </label>
          ))}
        </div>
        <input aria-label="Otras etiquetas, separadas por comas" className={`${FIELD_CLASS} mt-2 py-2 text-[13px]`} maxLength={120} name="otras" placeholder="Otra etiqueta, separadas por comas" />
      </fieldset>
      <label className="flex flex-col gap-2" htmlFor={id}>
        <span className={LABEL_CLASS}>Nota</span>
        <textarea className={`${FIELD_CLASS} min-h-24`} defaultValue={nota ?? ''} id={id} maxLength={2000} name="nota" placeholder="Prefiere tonos lila · llamar después del 15 · la mamá decide" />
      </label>
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Guardando…" variant="default">
          Guardar
        </SubmitButton>
        <ActionFeedback state={estado} />
      </div>
    </form>
  )
}

/** La opinión que el cliente dejó publicar, a los testimonios de la web de un toque. */
export function PublicarOpinion({ eventId, autor, rol }: { eventId: string; autor: string; rol: string }) {
  const [estado, publicar] = useActionState(sinCaerse(publicarOpinionAction), INICIAL)
  if (estado.status === 'success') return <ActionFeedback state={estado} />
  return (
    <form action={publicar} className="flex flex-wrap items-center gap-2">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="autor" type="hidden" value={autor} />
      <input name="rol" type="hidden" value={rol} />
      <SubmitButton variant="default">
        Publicar en la web
      </SubmitButton>
      <ActionFeedback errorsOnly state={estado} />
    </form>
  )
}
