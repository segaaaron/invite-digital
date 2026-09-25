'use client'

import { useEffect, useRef, useState } from 'react'
import type { DoorManifestGroup } from '../application/get-door-manifest'
import { resolveLocally } from './local-resolve'

/** `scanned` es el enlace; con el código corto va nulo y se registra por la invitación. */
export type ManualCandidate = { readonly scanned: string | null; readonly group: DoorManifestGroup; readonly yaDentro: boolean }

/**
 * Escribir el código del pase a mano, y **confirmar antes de registrar**.
 *
 * La cámara no confirma nada: el escaneo ya es el acto intencionado, el código es
 * inequívoco, y con ciento veinte invitados llegando en veinte minutos un toque más por
 * invitado es una fila en la puerta. Aquí es al revés: se teclea con poca luz y con prisa,
 * los códigos se parecen, y ver el nombre antes de registrar es justo lo que evita darle
 * entrada al grupo equivocado.
 *
 * Resuelve **en el dispositivo**, contra el manifiesto: el salón no tiene señal y esta
 * pantalla no puede quedarse esperando a un servidor.
 */
export function ManualPassDialog({
  groups,
  arrivedIds,
  onConfirm,
  onConfirmGrupo,
  onClose,
}: {
  groups: readonly DoorManifestGroup[]
  arrivedIds: ReadonlySet<string>
  onConfirm: (scanned: string) => void
  /** Con el código corto del pase (`K7P3X`): se registra por la invitación. */
  onConfirmGrupo: (groupId: string) => void
  onClose: () => void
}) {
  const [codigo, setCodigo] = useState('')
  const [candidato, setCandidato] = useState<ManualCandidate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => campo.current?.focus(), [])

  const buscar = async () => {
    setError(null)
    // Primero el código corto que va impreso bajo el QR; si no, el enlace entero.
    const corto = codigo.replace(/[\s-]/g, '').toUpperCase()
    const porCodigo = groups.find((g) => g.passCode !== undefined && g.passCode !== null && g.passCode === corto)
    if (porCodigo !== undefined) {
      setCandidato({ scanned: null, group: porCodigo, yaDentro: arrivedIds.has(porCodigo.id) })
      return
    }
    const local = await resolveLocally(codigo.trim(), groups, arrivedIds)
    if (local.kind === 'unknown' || !local.group) {
      setError('Ese código no es de este evento. Revísalo o busca por nombre.')
      setCandidato(null)
      return
    }
    setCandidato({ scanned: codigo.trim(), group: local.group, yaDentro: local.kind === 'already' })
  }

  const acompanantes = candidato === null ? 0 : Math.max(0, candidato.group.seats - 1)
  const titular =
    candidato === null
      ? ''
      : candidato.group.leadName === null
        ? candidato.group.label
        : acompanantes === 0
          ? candidato.group.leadName
          : `${candidato.group.leadName} y ${acompanantes} acompañante${acompanantes === 1 ? '' : 's'}`

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
      <div className="w-full max-w-[420px] rounded-3xl bg-bg-top p-6 text-ink shadow-float" role="dialog" aria-modal>
        {candidato === null ? (
          <>
            <p className="font-mono text-[10.5px] tracking-[0.16em] text-ink-mute uppercase">Código manual</p>
            <h2 className="mt-1.5 font-display text-[24px] font-light">Escribe el código del pase</h2>

            <input
              ref={campo}
              autoComplete="off"
              autoCapitalize="characters"
              className="mt-4 w-full rounded-[14px] border border-line-panel-strong bg-white px-4 py-3.5 font-mono text-[18px] tracking-[0.2em] text-ink uppercase outline-none placeholder:text-[13px] placeholder:tracking-normal placeholder:normal-case focus-visible:border-ink"
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void buscar()
              }}
              placeholder="Código del pase, por ejemplo K7P3X"
              value={codigo}
            />

            {error === null ? null : (
              <p className="mt-3 text-[13px] text-danger" role="alert">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-2.5">
              <button
                className="flex-1 rounded-full border border-line-panel-strong px-4 py-3.5 font-mono text-[10px] tracking-[0.25em] text-ink uppercase"
                onClick={onClose}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="flex-1 rounded-full bg-ink px-4 py-3.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase disabled:opacity-40"
                disabled={codigo.trim() === ''}
                onClick={() => void buscar()}
                type="button"
              >
                Buscar
              </button>
            </div>
          </>
        ) : (
          <>
            {/* La confirmación: el nombre grande, para cotejarlo con quien tienes
                delante antes de registrar nada. */}
            <p aria-hidden className="mx-auto grid size-14 place-items-center rounded-full border border-gold text-[22px] text-gold-deep">
              ✓
            </p>
            <h2 className="mt-4 text-center font-display text-[26px] leading-tight font-light italic">{titular}</h2>
            <p className="mt-3 text-center">
              <span className="rounded-[var(--radius-pill)] bg-bg-sunken px-3.5 py-1.5 font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
                {candidato.group.tableLabel ?? 'Mesa por asignar'}
              </span>
            </p>
            {candidato.yaDentro ? (
              <p className="mt-3 text-center text-[12px] text-ink-soft">
                Este grupo ya tenía gente dentro. Al registrar podrás ajustar cuántos hay en total.
              </p>
            ) : null}

            <div className="mt-6 flex gap-2.5">
              <button
                className="flex-1 rounded-full border border-line-panel-strong px-4 py-3.5 font-mono text-[10px] tracking-[0.25em] text-ink uppercase"
                onClick={() => setCandidato(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="flex-1 rounded-full bg-ink px-4 py-3.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase"
                onClick={() => (candidato.scanned === null ? onConfirmGrupo(candidato.group.id) : onConfirm(candidato.scanned))}
                type="button"
              >
                ✓ Registrar ingreso
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
