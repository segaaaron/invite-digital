'use client'

import { useId, useState, useTransition } from 'react'
import type { Fund } from '../domain/fund'
import { addFundAction, updateFundAction } from '../actions'
import {
  centsOrMessage,
  centsToInput,
  FIELD_CLASS,
  FIELD_CLASS_DARK,
  LABEL_CLASS,
  LABEL_CLASS_DARK,
  nullIfBlank,
  SUBMIT_CLASS,
  SUBMIT_CLASS_DARK,
} from './shared'

/**
 * El mismo formulario abre un fondo y corrige uno abierto. Con `fund` está en modo
 * edición.
 *
 * Bajar la meta por debajo de lo ya recaudado es legítimo —la pareja ajusta su
 * objetivo— y no hace falta ninguna comprobación aquí para que la pantalla aguante:
 * `progressOf` recorta el porcentaje al 100 y dice el exceso con palabras, así que la
 * barra no se sale de su contenedor por mucho que la meta baje.
 */
export function FundForm({
  eventId,
  eventSlug,
  fund,
  onDone,
}: {
  eventId: string
  eventSlug: string
  fund?: Fund
  onDone?: () => void
}) {
  const editando = fund !== undefined
  // Editar se hace dentro de la tarjeta oscura del fondo; abrir uno nuevo, sobre marfil.
  const campo = editando ? FIELD_CLASS_DARK : FIELD_CLASS
  const rotulo = editando ? LABEL_CLASS_DARK : LABEL_CLASS
  const enviarClase = editando ? SUBMIT_CLASS_DARK : SUBMIT_CLASS

  const [name, setName] = useState(fund?.name ?? '')
  const [goal, setGoal] = useState(fund === undefined ? '' : centsToInput(fund.goalCents))
  const [description, setDescription] = useState(fund?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const nameId = useId()
  const goalId = useId()
  const descriptionId = useId()

  const enviar = () => {
    const meta = centsOrMessage(goal)
    if ('error' in meta) {
      setError(meta.error)
      return
    }

    setError(null)
    const campos = {
      eventId,
      eventSlug,
      name: name.trim(),
      description: nullIfBlank(description),
      goalCents: meta.cents,
    }

    empezar(async () => {
      const r = fund === undefined ? await addFundAction(campos) : await updateFundAction({ id: fund.id, ...campos })

      if (!r.ok) {
        setError(r.message)
        return
      }

      if (fund !== undefined) {
        onDone?.()
        return
      }

      setName('')
      setGoal('')
      setDescription('')
    })
  }

  return (
    <div className="flex flex-col gap-5 rounded-[18px] border border-[var(--color-line)] p-6">
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <label className={rotulo} htmlFor={nameId}>
          Fondo
          <input
            className={campo}
            id={nameId}
            maxLength={160}
            onChange={(e) => setName(e.target.value)}
            placeholder="Luna de miel"
            type="text"
            value={name}
          />
        </label>

        <label className={rotulo} htmlFor={goalId}>
          Meta
          <input
            className={campo}
            id={goalId}
            inputMode="decimal"
            onChange={(e) => setGoal(e.target.value)}
            placeholder="5.000,00"
            type="text"
            value={goal}
          />
        </label>
      </div>

      <label className={rotulo} htmlFor={descriptionId}>
        Descripción
        <input
          className={campo}
          id={descriptionId}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Para los pasajes y las noches de hotel."
          type="text"
          value={description}
        />
      </label>

      {error === null ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button className={enviarClase} disabled={pendiente} onClick={enviar} type="button">
          {editando ? (pendiente ? 'Guardando…' : 'Guardar cambios') : pendiente ? 'Abriendo…' : 'Abrir fondo'}
        </button>

        {editando ? (
          <button
            className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
            disabled={pendiente}
            onClick={() => onDone?.()}
            type="button"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  )
}
