'use client'

import Link from 'next/link'
import { useId, useRef } from 'react'
import type { Mejorar } from '@/modules/plans'
import { NOMBRE_DEL_ASISTENTE } from '../domain/reglas'

const LO_QUE_HACE = [
  'Carga a tus invitados escribiendo o dictando sus nombres.',
  'Te dice quién falta por responder y qué te falta esta semana.',
  'Arma tu cronograma, tu presupuesto y tus citas; tú solo confirmas.',
]

/**
 * **Luxury bloqueado**: el mismo botón flotante, con candado, para quien podría usarlo y su evento no lo
 * tiene. Es la función más vistosa del panel: que sepa que existe y cómo conseguirla (plan o extra).
 */
export function LuxuryBloqueado({ mejorar, planes, comoExtra }: { mejorar: Mejorar; planes: readonly string[]; comoExtra: boolean }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const titulo = useId()
  const donde = [planes.length === 0 ? null : `el plan ${planes.join(' o ')}`, comoExtra ? 'como extra' : null].filter((x) => x !== null).join(' o ')

  return (
    <>
      <button
        aria-label={`Conocer a ${NOMBRE_DEL_ASISTENTE}, tu planner con IA`}
        className="fixed right-4 bottom-4 z-30 max-[859px]:right-auto max-[859px]:left-4 max-[767px]:bottom-[calc(92px+env(safe-area-inset-bottom))] min-[768px]:max-[859px]:left-[92px] inline-flex size-13 cursor-pointer items-center justify-center gap-2 rounded-full border border-line-panel-strong bg-white text-[13.5px] font-medium text-ink shadow-float transition-transform hover:-translate-y-0.5 min-[860px]:right-5 min-[860px]:bottom-5 min-[860px]:w-auto min-[860px]:pr-5 min-[860px]:pl-4 print:hidden"
        onClick={() => dialogo.current?.showModal()}
        type="button"
      >
        <Candado className="size-4 text-gold-deep" />
        <span className="max-[859px]:sr-only">{NOMBRE_DEL_ASISTENTE}</span>
      </button>

      <dialog
        aria-labelledby={titulo}
        className="m-auto w-[min(420px,calc(100vw-32px))] rounded-[20px] border border-line-panel bg-bg-raised p-0 text-ink shadow-float backdrop:bg-ink/35"
        onClick={(e) => {
          if (e.target === dialogo.current) dialogo.current?.close()
        }}
        ref={dialogo}
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid size-11 place-items-center rounded-full bg-ink text-gold">
              <Candado className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-[26px] leading-tight font-light" id={titulo}>
                {NOMBRE_DEL_ASISTENTE}
              </h2>
              <p className="text-[12px] text-ink-mute">Tu planner con IA, dentro del panel.</p>
            </div>
          </div>
          <ul className="flex flex-col gap-2 text-[13.5px] leading-relaxed text-ink-soft">
            {LO_QUE_HACE.map((x) => (
              <li className="flex gap-2" key={x}>
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                {x}
              </li>
            ))}
          </ul>
          {donde === '' ? null : <p className="text-[13px] text-ink">{`Lo tienes con ${donde}.`}</p>}
          <div className="flex flex-wrap gap-2">
            {mejorar === null ? (
              <p className="text-[12.5px] text-ink-mute">Pídeselo a quien organiza tu evento.</p>
            ) : (
              <Link className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white" href={mejorar.href}>
                {mejorar.label}
              </Link>
            )}
            <button className="cursor-pointer rounded-full border border-line-panel-strong bg-white px-5 py-2.5 text-[13px] text-ink" onClick={() => dialogo.current?.close()} type="button">
              Ahora no
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}

function Candado({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24">
      <rect height="10" rx="2" width="14" x="5" y="11" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
