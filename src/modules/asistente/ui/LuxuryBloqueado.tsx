'use client'

import Link from 'next/link'
import { useId, useRef } from 'react'
import type { Mejorar } from '@/modules/plans'
import { NOMBRE_DEL_ASISTENTE } from '../domain/reglas'
import { RobotLuxury } from './RobotLuxury'
import type { T } from '@/shared/i18n/t'
import { useT } from '@/shared/i18n/idioma-navegador'

const loQueHace = (t: T) => [
  t('Carga a tus invitados escribiendo o dictando sus nombres.', 'Adds your guests as you type or dictate their names.'),
  t('Te dice quién falta por responder y qué te falta esta semana.', 'Tells you who has not replied and what is left this week.'),
  t('Arma tu cronograma, tu presupuesto y tus citas; tú solo confirmas.', 'Builds your schedule, budget and appointments; you just confirm.'),
]

/**
 * **Luxury bloqueado**: el mismo botón flotante, con candado, para quien podría usarlo y su evento no lo
 * tiene. Es la función más vistosa del panel: que sepa que existe y cómo conseguirla (plan o extra).
 */
export function LuxuryBloqueado({ mejorar, planes, comoExtra }: { mejorar: Mejorar; planes: readonly string[]; comoExtra: boolean }) {
  const t = useT()
  const dialogo = useRef<HTMLDialogElement>(null)
  const titulo = useId()
  const donde = [planes.length === 0 ? null : t(`el plan ${planes.join(' o ')}`, `the ${planes.join(' or ')} plan`), comoExtra ? t('como extra', 'as an extra') : null]
    .filter((x) => x !== null)
    .join(t(' o ', ' or '))

  return (
    <>
      {/* El mismo robot que el de quien lo tiene, en su sitio, apagado y con un candadito. */}
      <button
        aria-label={t(`Conocer a ${NOMBRE_DEL_ASISTENTE}, tu planner con IA`, `Meet ${NOMBRE_DEL_ASISTENTE}, your AI planner`)}
        className="fixed right-3.5 bottom-[calc(10px+env(safe-area-inset-bottom))] z-30 block h-[72px] w-[60px] cursor-pointer opacity-80 grayscale-[.45] transition-transform hover:-translate-y-0.5 min-[768px]:right-6 min-[768px]:bottom-6 min-[1280px]:right-9 min-[1280px]:bottom-9 print:hidden"
        onClick={() => dialogo.current?.showModal()}
        type="button"
      >
        <RobotLuxury className="size-full" />
        <span aria-hidden className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full border border-line-panel-strong bg-bg-raised text-gold-deep">
          <Candado className="size-3.5" />
        </span>
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
            <RobotLuxury className="h-14 w-12 shrink-0" />
            <div>
              <h2 className="font-display text-[26px] leading-tight font-light" id={titulo}>
                {NOMBRE_DEL_ASISTENTE}
              </h2>
              <p className="text-[12px] text-ink-mute">{t('Tu planner con IA, dentro del panel.', 'Your AI planner, inside the panel.')}</p>
            </div>
          </div>
          <ul className="flex flex-col gap-2 text-[13.5px] leading-relaxed text-ink-soft">
            {loQueHace(t).map((x) => (
              <li className="flex gap-2" key={x}>
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                {x}
              </li>
            ))}
          </ul>
          {donde === '' ? null : <p className="text-[13px] text-ink">{t(`Lo tienes con ${donde}.`, `You get it with ${donde}.`)}</p>}
          <div className="flex flex-wrap gap-2">
            {mejorar === null ? (
              <p className="text-[12.5px] text-ink-mute">{t('Pídeselo a quien organiza tu evento.', 'Ask whoever organizes your event.')}</p>
            ) : (
              <Link className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white" href={mejorar.href}>
                {mejorar.label}
              </Link>
            )}
            <button className="cursor-pointer rounded-full border border-line-panel-strong bg-white px-5 py-2.5 text-[13px] text-ink" onClick={() => dialogo.current?.close()} type="button">
              {t('Ahora no', 'Not now')}
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
