'use client'

import type { ScanOutcome } from '../application/check-in-by-scan'

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

const hora = (d: Date) => d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

/**
 * El personal de puerta mira esta tarjeta de reojo, con poca luz y una fila detrás: el
 * color y el titular tienen que bastar sin leer el resto.
 *
 * En pantalla ancha se centra con `mx-auto`, no con `-translate-x-1/2`: la animación de
 * entrada escribe `transform` y le comería el centrado.
 */
export function ScanResultCard({ outcome, onAdjust, onUndo, onDismiss }: Props) {
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
            {outcome.kind === 'welcome' ? '✓ Bienvenidos' : '! Ya había ingresado'}
          </p>
          <p className="mt-2 font-display text-[30px] italic leading-tight">{outcome.group.label}</p>
          <p className="mt-1.5 text-[13px] opacity-80">
            {outcome.group.seats} cupo{outcome.group.seats === 1 ? '' : 's'}
            {outcome.kind === 'already' ? ` · registrado a las ${hora(outcome.arrivedAt)}` : ''}
          </p>

          {/* El dato que el invitado pregunta nada más entrar. Va grande y solo: el
              personal lo lee de reojo y lo dice en voz alta. */}
          <p
            aria-label="Mesa asignada"
            className="mt-3 rounded-2xl bg-black/20 px-4 py-2.5 text-center font-display text-[24px] italic leading-tight"
          >
            {outcome.group.tableLabel ?? 'Mesa por asignar'}
          </p>

          {outcome.kind === 'welcome' ? (
            <div className="mt-4 flex items-center gap-3 text-[13px]">
              <span className="opacity-80">¿Cuántos entraron?</span>
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
                  disabled={outcome.arrivedCount >= outcome.group.seats}
                  onClick={() => onAdjust(outcome.scanId, outcome.arrivedCount + 1)}
                  className="size-[34px] rounded-full bg-white/15 text-[17px] disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
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
