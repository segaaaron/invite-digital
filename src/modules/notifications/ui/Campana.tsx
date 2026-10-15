'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react'
import { abrirCampanaAction, type AvisoDeLaCampana } from '@/app/_acciones/notifications/avisos-actions'
import { ArrowLeftIcon, BellIcon, CalendarIcon, CloseIcon, CheckIcon, EyeIcon, GiftIcon, MessageIcon, PenIcon, ReceiptIcon } from '@/shared/design/ui/icons'
import { escucharEnVivo } from '@/shared/design/ui/panel/EnVivo'
import { hace } from '@/shared/format/fecha'
import { ActivarAvisos } from './ActivarAvisos'
import { useIdioma, useT } from '@/shared/i18n/idioma-navegador'

const ICONO: Record<string, ReactNode> = {
  rsvp: <CheckIcon className="size-4" />,
  mensaje: <MessageIcon className="size-4" />,
  apertura: <EyeIcon className="size-4" />,
  regalo: <GiftIcon className="size-4" />,
  agenda: <CalendarIcon className="size-4" />,
  diseno: <PenIcon className="size-4" />,
  venta: <ReceiptIcon className="size-4" />,
}

/**
 * **La campana**: lo que pasó en tus eventos mientras no mirabas —confirmaciones, mensajes, invitaciones
 * abiertas, regalos, lo que vence— y, para el admin, las ventas. La cuenta se entera en vivo (SSE, sin
 * sondeo); al abrirla se leen los avisos y quedan vistos. Abajo, activar las notificaciones push en este
 * aparato y el enlace a las preferencias.
 */
export function Campana({ sinVer, clavePublica }: { sinVer: number; clavePublica: string | null }) {
  const t = useT()
  const locale = useIdioma()
  const [pendientes, setPendientes] = useState(sinVer)
  const [lista, setLista] = useState<AvisoDeLaCampana[] | null>(null)
  const [cargando, empezar] = useTransition()
  const dialogo = useRef<HTMLDialogElement>(null)
  const titulo = useId()

  useEffect(
    () =>
      escucharEnVivo('/panel/avisos/en-vivo', {
        alAbrir: () => undefined,
        alFallar: () => undefined,
        alCambiar: (tipo) => {
          if (tipo === 'aviso') setPendientes((n) => n + 1)
        },
      }),
    [],
  )

  const abrir = () => {
    dialogo.current?.showModal()
    empezar(async () => {
      setLista(await abrirCampanaAction())
      setPendientes(0)
    })
  }
  const cerrar = () => dialogo.current?.close()
  const ahora = new Date()
  const rotulo = pendientes === 0 ? t('Avisos', 'Notifications') : t(`Avisos: ${pendientes} ${pendientes === 1 ? 'nuevo' : 'nuevos'}`, `Notifications: ${pendientes} new`)

  return (
    <>
      <button
        aria-label={rotulo}
        className="relative inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink transition-colors hover:text-shell-deep min-[768px]:rounded-[10px] min-[768px]:border min-[768px]:border-line-panel-strong min-[768px]:bg-bg-raised min-[768px]:hover:border-gold"
        onClick={abrir}
        title={rotulo}
        type="button"
      >
        <BellIcon className="size-5" />
        {/* Maqueta: un punto de latón; cuántos, lo dice el nombre del botón y la lista al abrirla. */}
        {pendientes > 0 ? <span aria-hidden className="absolute top-2.5 right-[11px] size-[7px] rounded-full bg-gold" /> : null}
        <span aria-live="polite" className="sr-only">
          {pendientes > 0 ? rotulo : ''}
        </span>
      </button>

      <dialog
        aria-labelledby={titulo}
        // En el celular, una hoja a pantalla completa; en tableta y escritorio, el desplegable bajo la campana (E19).
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none border-l border-line-panel bg-bg-raised p-0 text-ink shadow-float backdrop:bg-shell-deep/40 min-[768px]:top-[72px] min-[768px]:right-6 min-[768px]:bottom-auto min-[768px]:h-auto min-[768px]:max-h-[min(560px,80dvh)] min-[768px]:w-[380px] min-[768px]:rounded-[16px] min-[768px]:border min-[768px]:shadow-lift min-[768px]:backdrop:bg-transparent max-[767px]:border-0 max-[767px]:bg-bg min-[1280px]:top-[78px] min-[1280px]:right-12"
        onClick={(e) => {
          if (e.target === dialogo.current) cerrar()
        }}
        ref={dialogo}
      >
        <div className="flex h-full max-h-[inherit] flex-col">
          {/* En el celular (M29): pantalla entera con «← Avisos» en su isla y el título grande. */}
          <button
            className="mx-4 mt-2.5 flex min-h-15 shrink-0 cursor-pointer items-center gap-2 rounded-[18px] border border-line-panel bg-bg-raised px-1.5 text-left shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)] min-[768px]:hidden"
            onClick={cerrar}
            type="button"
          >
            <span aria-hidden className="grid size-11 shrink-0 place-items-center">
              <ArrowLeftIcon className="size-5" />
            </span>
            <span className="truncate text-[16px] font-medium">Avisos</span>
            <span className="sr-only">{t(': cerrar', ': close')}</span>
          </button>
          <header className="flex items-center justify-between gap-4 border-b border-line-panel px-5 py-3.5 max-[767px]:border-b-0 max-[767px]:px-4 max-[767px]:pt-6">
            <h2 className="font-display text-[22px] leading-tight font-medium max-[767px]:text-[30px]" id={titulo}>
              {t('Avisos', 'Notifications')}
            </h2>
            <button
              aria-label={t('Cerrar', 'Close')}
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-[10px] text-ink-mute transition-colors hover:text-ink max-[767px]:hidden"
              onClick={cerrar}
              type="button"
            >
              <CloseIcon className="size-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto" aria-busy={cargando}>
            {lista === null ? (
              <p className="px-3 py-6 text-[13px] text-ink-mute">{t('Cargando…', 'Loading…')}</p>
            ) : lista.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <span className="grid size-12 place-items-center rounded-full border border-gold/40 bg-white text-gold-deep">
                  <BellIcon className="size-5" />
                </span>
                <p className="font-display text-[20px] text-ink">{t('Todo tranquilo', 'All quiet')}</p>
                <p className="text-[13px] text-ink-mute">{t('Aquí verás quién confirma, quién te escribe y lo que vence.', 'Here you will see who RSVPs, who writes to you and what is due.')}</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {lista.map((a) => (
                  <li key={a.id}>
                    <Link
                      className={`flex gap-3 border-b border-line-panel px-5 py-3 text-ink no-underline transition-colors hover:bg-fila ${a.visto ? '' : 'bg-pill-pending/50'}`}
                      href={a.href}
                      onClick={cerrar}
                    >
                      <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-pill-pending text-gold-deep">
                        {ICONO[a.kind] ?? <BellIcon className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] leading-snug font-medium">{a.title}</span>
                        {a.body === '' ? null : <span className="mt-0.5 block truncate text-[13px] text-ink-mute">{a.body}</span>}
                      </span>
                      <span className="shrink-0 text-[12px] text-ink-mute">{hace(new Date(a.createdAt), ahora, locale)}</span>
                      {a.visto ? null : <span className="sr-only">{t('Nuevo', 'New')}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="flex flex-col items-center gap-2.5 px-5 py-3.5">
            <ActivarAvisos clavePublica={clavePublica} />
            <Link className="text-[14px] font-medium text-gold-deep underline underline-offset-4 hover:text-ink" href="/panel/cuenta#avisos" onClick={cerrar}>
              {t('Elegir qué avisos recibo', 'Choose which notifications I get')}
            </Link>
          </footer>
        </div>
      </dialog>
    </>
  )
}
