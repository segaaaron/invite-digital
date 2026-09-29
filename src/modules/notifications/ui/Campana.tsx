'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react'
import { abrirCampanaAction, type AvisoDeLaCampana } from '@/app/_acciones/notifications/avisos-actions'
import { BellIcon, CalendarIcon, CheckIcon, EyeIcon, GiftIcon, MessageIcon, ReceiptIcon } from '@/shared/design/ui/icons'
import { escucharEnVivo } from '@/shared/design/ui/panel/EnVivo'
import { hace } from '@/shared/format/fecha'
import { ActivarAvisos } from './ActivarAvisos'

const ICONO: Record<string, ReactNode> = {
  rsvp: <CheckIcon className="size-4" />,
  mensaje: <MessageIcon className="size-4" />,
  apertura: <EyeIcon className="size-4" />,
  regalo: <GiftIcon className="size-4" />,
  agenda: <CalendarIcon className="size-4" />,
  venta: <ReceiptIcon className="size-4" />,
}

/**
 * **La campana**: lo que pasó en tus eventos mientras no mirabas —confirmaciones, mensajes, invitaciones
 * abiertas, regalos, lo que vence— y, para el admin, las ventas. La cuenta se entera en vivo (SSE, sin
 * sondeo); al abrirla se leen los avisos y quedan vistos. Abajo, activar las notificaciones push en este
 * aparato y el enlace a las preferencias.
 */
export function Campana({ sinVer, clavePublica }: { sinVer: number; clavePublica: string | null }) {
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
  const rotulo = pendientes === 0 ? 'Avisos' : `Avisos: ${pendientes} ${pendientes === 1 ? 'nuevo' : 'nuevos'}`

  return (
    <>
      <button
        aria-label={rotulo}
        className={`relative inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${
          pendientes > 0 ? 'border-ink bg-ink text-white hover:bg-ink/90' : 'border-line-panel-strong bg-white/80 text-ink-soft hover:border-ink hover:text-ink'
        }`}
        onClick={abrir}
        title={rotulo}
        type="button"
      >
        <BellIcon className="size-[18px]" />
        {pendientes > 0 ? (
          <span aria-hidden className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-gold px-1 font-mono text-[10.5px] leading-5 text-white shadow-card">
            {pendientes > 99 ? '99+' : pendientes}
          </span>
        ) : null}
        <span aria-live="polite" className="sr-only">
          {pendientes > 0 ? rotulo : ''}
        </span>
      </button>

      <dialog
        aria-labelledby={titulo}
        className="panel-lateral fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none border-l border-line-panel bg-bg-raised p-0 text-ink shadow-float backdrop:bg-ink/35 min-[640px]:w-[min(440px,100vw)]"
        onClick={(e) => {
          if (e.target === dialogo.current) cerrar()
        }}
        ref={dialogo}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-line-panel px-6 py-5">
            <h2 className="font-display text-[26px] leading-tight font-light" id={titulo}>
              Avisos
            </h2>
            <button
              aria-label="Cerrar"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-panel bg-white text-[13px] transition-colors hover:border-ink"
              onClick={cerrar}
              type="button"
            >
              <span aria-hidden>✕</span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-3" aria-busy={cargando}>
            {lista === null ? (
              <p className="px-3 py-6 text-[13px] text-ink-mute">Cargando…</p>
            ) : lista.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <span className="grid size-12 place-items-center rounded-full border border-gold/40 bg-white text-gold-deep">
                  <BellIcon className="size-5" />
                </span>
                <p className="font-display text-[20px] text-ink">Todo tranquilo</p>
                <p className="text-[13px] text-ink-mute">Aquí verás quién confirma, quién te escribe y lo que vence.</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {lista.map((a) => (
                  <li key={a.id}>
                    <Link
                      className={`flex gap-3 rounded-[14px] px-3 py-3 transition-colors hover:bg-bg-sunken/70 ${a.visto ? '' : 'bg-gold/8'}`}
                      href={a.href}
                      onClick={cerrar}
                    >
                      <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-bg-sunken text-sage-deep">
                        {ICONO[a.kind] ?? <BellIcon className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] leading-snug text-ink">{a.title}</span>
                        {a.body === '' ? null : <span className="mt-0.5 block truncate text-[12.5px] text-ink-mute">{a.body}</span>}
                        <span className="mt-1 block font-mono text-[10.5px] tracking-[0.06em] text-ink-mute">{hace(new Date(a.createdAt), ahora)}</span>
                      </span>
                      {a.visto ? null : <span aria-label="Nuevo" className="mt-2 size-2 shrink-0 rounded-full bg-gold" />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="flex flex-col gap-3 border-t border-line-panel px-6 py-4">
            <ActivarAvisos clavePublica={clavePublica} />
            <Link className="text-[12.5px] text-ink-soft underline underline-offset-4 hover:text-ink" href="/panel/cuenta#avisos" onClick={cerrar}>
              Elegir qué avisos recibo
            </Link>
          </footer>
        </div>
      </dialog>
    </>
  )
}
