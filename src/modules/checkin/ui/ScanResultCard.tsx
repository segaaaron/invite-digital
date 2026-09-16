'use client'

import { hora as horaBolivia } from '@/shared/format/fecha'
import { MAX_EXTRA_ARRIVALS } from '../domain/arrival'
import type { ScanGroupView, ScanOutcome } from '../application/check-in-by-scan'

/**
 * Lo que la puerta lee en voz alta.
 *
 * El nombre de quien encabeza el grupo, si hay personas cargadas: «Valentina Ruiz y 2
 * acompañantes» se coteja con quien tienes delante; «Familia Rojas Peña» es lo que
 * escribió el atelier. Sin personas cargadas cae a la etiqueta, que es el estado de todos
 * los eventos anteriores a `guest_people`.
 */
function titular(group: ScanGroupView): string {
  if (group.leadName === null) return group.label
  // Con personas, la lista de abajo dice quién es quién: el titular es solo quien encabeza.
  if (group.people.length > 0) return group.leadName
  const acompanantes = Math.max(0, group.seats - 1)
  if (acompanantes === 0) return group.leadName
  return `${group.leadName} y ${acompanantes} acompañante${acompanantes === 1 ? '' : 's'}`
}

type Props = {
  outcome: ScanOutcome
  onAdjust: (scanId: string, arrivedCount: number) => void
  onUndo: (scanId: string) => void
  onDismiss: () => void
}

const skin = {
  welcome: 'bg-ok',
  already: 'bg-warn',
  unknown: 'bg-danger',
} as const

const hora = horaBolivia

/**
 * El personal de puerta mira esta tarjeta de reojo, con poca luz y una fila detrás: el
 * color y el titular tienen que bastar sin leer el resto.
 *
 * En pantalla ancha se centra con `mx-auto`, no con `-translate-x-1/2`: la animación de
 * entrada escribe `transform` y le comería el centrado.
 */
export function ScanResultCard({ outcome, onAdjust, onUndo, onDismiss }: Props) {
  // Con personas cargadas, la puerta cuenta nombres, no un número: la lista sustituye al contador.
  const conPersonas = outcome.kind !== 'unknown' && outcome.group.people.length > 0
  const todosDentro =
    outcome.kind !== 'unknown' && outcome.group.people.every((persona) => outcome.personas[persona.id] !== undefined)
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${skin[outcome.kind]} fixed inset-x-0 bottom-0 z-30 rounded-t-3xl p-6 text-white shadow-float motion-safe:animate-slide-up md:bottom-5 md:mx-auto md:w-[min(560px,92vw)] md:rounded-3xl`}
    >
      {outcome.kind === 'unknown' ? (
        <>
          <p className="font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] opacity-85">✕ Pase no válido</p>
          <p className="mt-2 font-display text-[30px] italic leading-tight">Este código no es de tu evento</p>
          <p className="mt-1.5 text-[13px] opacity-80">Puede ser el pase de otra fiesta, o un QR cualquiera.</p>
        </>
      ) : (
        <>
          <p className="font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] opacity-85">
            {outcome.kind === 'welcome'
              ? '✓ Bienvenidos'
              : conPersonas && todosDentro
                ? '! Ya entraron todos'
                : '! Ya había ingresado'}
          </p>
          <p className="mt-2 font-display text-[30px] italic leading-tight">{titular(outcome.group)}</p>
          {conPersonas ? (
            // Quién entró y quién falta, con su hora. Cuando llega el que faltaba con el mismo
            // QR, la puerta ve aquí que su pareja ya está dentro.
            <ul aria-label="Personas de la invitación" className="mt-3 flex flex-col gap-1.5">
              {outcome.group.people.map((persona) => {
                const entro = outcome.personas[persona.id]
                return (
                  <li className={`rounded-xl bg-black/15 px-3.5 py-2 text-[14px] ${entro === undefined ? 'opacity-75' : ''}`} key={persona.id}>
                    {`${persona.fullName} · ${entro === undefined ? 'Por llegar' : `Entró ${hora(entro)}`}`}
                  </li>
                )
              })}
            </ul>
          ) : null}
          <p className="mt-1.5 text-[13px] opacity-80" hidden={conPersonas}>
            {outcome.group.leadName === null ? '' : `${outcome.group.label} · `}
            {outcome.group.seats} cupo{outcome.group.seats === 1 ? '' : 's'}
            {outcome.kind === 'already' ? ` · ${outcome.arrivedCount} dentro desde las ${hora(outcome.arrivedAt)}` : ''}
          </p>

          {/* El dato que el invitado pregunta nada más entrar. Va grande y solo: el
              personal lo lee de reojo y lo dice en voz alta. */}
          <p
            aria-label="Mesa asignada"
            className="mt-3 rounded-2xl bg-black/20 px-4 py-2.5 text-center font-display text-[24px] italic leading-tight"
          >
            {outcome.group.tableLabel ?? 'Mesa por asignar'}
          </p>

          {/* El contador vive en los **dos** estados, y esa es la diferencia que pidió
              la puerta: en una boda las familias llegan partidas —el padre a las 19:40,
              los hijos a las 20:20 con el mismo QR— y antes «ya había ingresado» solo
              ofrecía cerrar, así que media familia se quedaba sin registrar.

              Se pregunta el **total**, no cuántos más: la regla de conflicto se queda con
              la cantidad más reciente, así que un incremento se perdería al reconciliar. */}
          <div className="mt-4 flex items-center gap-3 text-[13px]" hidden={conPersonas}>
            <span className="opacity-80">
              {outcome.kind === 'welcome' ? '¿Cuántos entraron?' : '¿Cuántos hay dentro ahora?'}
            </span>
            <div className="ml-auto flex items-center gap-2.5 rounded-full border border-white/15 bg-black/20 p-1">
              <button
                type="button"
                aria-label="Una persona menos"
                disabled={outcome.arrivedCount <= 1}
                onClick={() => onAdjust(outcome.scanId, outcome.arrivedCount - 1)}
                className="size-[34px] rounded-full bg-white/15 text-[17px] disabled:opacity-30"
              >
                −
              </button>
              <span
                aria-label="Personas que entraron"
                className="min-w-6 text-center font-mono text-[18px] font-semibold"
              >
                {outcome.arrivedCount}
              </span>
              <button
                type="button"
                aria-label="Una persona más"
                disabled={outcome.arrivedCount >= outcome.group.seats + MAX_EXTRA_ARRIVALS}
                onClick={() => onAdjust(outcome.scanId, outcome.arrivedCount + 1)}
                className="size-[34px] rounded-full bg-white/15 text-[17px] disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>

          {/* Pasar de los cupos es el acompañante que aparece sin estar en la lista.
              Pasa en todas las bodas, y negarlo deja al catering contando mal. */}
          {!conPersonas && outcome.arrivedCount > outcome.group.seats ? (
            <p className="mt-2 text-[12px] opacity-85">{outcome.arrivedCount - outcome.group.seats} sin invitación</p>
          ) : null}
        </>
      )}

      <div className="mt-5 flex gap-2.5">
        {outcome.kind === 'welcome' ? (
          <button
            type="button"
            onClick={() => onUndo(outcome.scanId)}
            className="flex-1 rounded-full border border-white/30 bg-black/20 px-4 py-3.5 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)]"
          >
            Deshacer
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 rounded-full bg-white px-4 py-3.5 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink"
        >
          {outcome.kind === 'welcome' ? 'Siguiente invitado' : 'Cerrar'}
        </button>
      </div>
    </div>
  )
}
