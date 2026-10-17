'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { signOutAction } from '@/app/_acciones/identity/actions'
import { leaveSupportAction } from '@/app/_acciones/admin/support-actions'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import { esEntradaActiva } from './nav'
import { NAV_ICONS } from './nav-icons'
import { descripcionDe, useNavegacion } from './navegacion'
import { ABRIR_BUSCADOR, ABRIR_MENU } from '@/shared/design/ui/panel/avisos-del-panel'
import { SelloLA } from './PanelSidebar'
import { useT } from '@/shared/i18n/idioma-navegador'

export { ABRIR_MENU } from '@/shared/design/ui/panel/avisos-del-panel'

/** Pantallas fuera de la barra: la isla dice dónde estás igual. */
const FUERA_DE_LA_BARRA: Readonly<Record<string, readonly [string, string]>> = { '/panel/cuenta': ['Mi cuenta', 'My account'], '/panel/ayuda': ['Ayuda', 'Help'] }

const Trazo = ({ d }: { d: string }) => (
  <svg aria-hidden className="size-5.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d={d} />
  </svg>
)

/**
 * **El menú del celular** (v2.1 aprobada el 14 oct; antes, la isla de la maqueta M06 con «Nombre ▾»: nadie adivinaba
 * que se tocaba ahí). Arriba a la izquierda, un botón que dice **«Menú»**; a su lado, sin tocar, de qué evento se trata
 * (portada, nombre y cuándo) o, fuera de un evento, dónde estás. Al tocarlo, todas las secciones agrupadas, cada una con
 * una línea que dice qué hay dentro, el buscador si quien entra es admin, «Mi cuenta» y «Cerrar sesión».
 *
 * Solo por debajo de 768 px; el menú también lo abre la tablet desde las iniciales del carril. Quien ya dice dónde está
 * con su propia flecha de volver (el admin dentro de un evento o de un ajuste) esconde el `data-contexto`.
 */
export function MenuMovil({ crear }: { crear?: ReactNode } = {}) {
  const t = useT()
  const nav = useNavegacion()
  const ruta = usePathname()
  const hoja = useRef<HTMLDialogElement>(null)
  // El carril de la tablet abre este mismo menú: un solo menú guiado, no dos.
  useEffect(() => {
    const abrir = () => hoja.current?.showModal()
    window.addEventListener(ABRIR_MENU, abrir)
    return () => window.removeEventListener(ABRIR_MENU, abrir)
  }, [])
  // Al llegar a otra pantalla (también desde «Crear», que abre su propia hoja), el menú se cierra.
  useEffect(() => {
    hoja.current?.close()
  }, [ruta])
  if (nav === null) return null
  const { sections, user, evento } = nav
  const actual = sections.flatMap((s) => s.items).find((item) => esEntradaActiva(item, ruta))?.label ?? (FUERA_DE_LA_BARRA[ruta] === undefined ? undefined : t(...FUERA_DE_LA_BARRA[ruta]))
  const cerrar = () => hoja.current?.close()
  const miniatura = (alto: number) =>
    evento?.portada ? (
      // Miniatura de la portada del diseño; el nombre del evento va al lado, en texto.
      // Si el arte no llega, la miniatura se quita: nunca el icono de imagen rota junto al nombre.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="shrink-0 rounded-[5px] object-cover"
        onError={(e) => {
          e.currentTarget.hidden = true
        }}
        // El error puede llegar antes de hidratar (y `onError` no se entera): al montar se mira si ya falló.
        ref={(img) => {
          if (img !== null && img.complete && img.naturalWidth === 0) img.hidden = true
        }}
        src={evento.portada}
        style={{ height: alto, width: (alto * 2) / 3 }}
      />
    ) : (
      <SelloLA size={40} />
    )

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-line-panel-strong bg-bg-raised px-3 text-[15px] font-medium text-ink min-[768px]:hidden"
        onClick={() => hoja.current?.showModal()}
        type="button"
      >
        <Trazo d="M4 7h16M4 12h16M4 17h16" />
        {t('Menú', 'Menu')}
      </button>
      <span className="flex min-w-0 flex-1 items-center gap-2.5 min-[768px]:hidden" data-contexto="">
        {evento === null ? null : miniatura(40)}
        <span className="min-w-0">
          <span className="block truncate text-[15.5px] leading-tight font-semibold text-ink">{evento === null ? (actual ?? t('Panel', 'Panel')) : evento.title}</span>
          {evento === null ? null : <span className="block truncate text-[12.5px] text-ink-mute">{evento.cuando ?? evento.planLabel}</span>}
        </span>
      </span>

      <dialog
        aria-label={evento === null ? t('Menú', 'Menu') : t('Menú del evento', 'Event menu')}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-bg p-0 text-ink backdrop:bg-ink/40 motion-safe:animate-slide-up min-[768px]:right-auto min-[768px]:w-[440px] min-[768px]:border-r min-[768px]:border-line-panel min-[768px]:shadow-float min-[768px]:motion-safe:animate-none"
        ref={hoja}
      >
        <div className="mx-auto flex min-h-full max-w-[640px] flex-col gap-1 px-4 pt-[env(safe-area-inset-top)] pb-[max(env(safe-area-inset-bottom),20px)]">
          {/* Arriba, en el mismo sitio que «Menú», «Cerrar» (v2.1): se abre y se cierra con el mismo dedo. */}
          <div className="sticky top-0 z-10 -mx-4 mb-2 flex min-h-14 items-center gap-2.5 border-b border-line-panel bg-bg-raised/95 px-3 backdrop-blur-md">
            <button
              aria-label={t('Cerrar el menú', 'Close the menu')}
              className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-line-panel-strong bg-bg-raised px-3 text-[15px] font-medium text-ink"
              onClick={cerrar}
              type="button"
            >
              <Trazo d="M6 6l12 12M18 6 6 18" />
              {t('Cerrar', 'Close')}
            </button>
            <span className="min-w-0 flex-1 truncate pl-1 font-display text-[22px] font-medium">{t('Menú', 'Menu')}</span>
          </div>

          {user.soporte ? (
            <div className="mb-2 flex items-center gap-3 rounded-2xl bg-pill-pending px-4 py-3 text-pill-pending-ink">
              <p className="min-w-0 flex-1 text-[14px] leading-snug">{t(`Viendo el panel de ${user.nombre ?? user.email}. Lo que cambies queda registrado a tu nombre.`, `Viewing the panel of ${user.nombre ?? user.email}. Whatever you change is logged under your name.`)}</p>
              <button
                className="shrink-0 cursor-pointer rounded-[10px] bg-shell-deep px-4 py-2.5 text-[14px] font-medium text-shell-ink"
                onClick={() => void leaveSupportAction().then((hecho) => hecho.status === 'ok' && window.location.assign(hecho.href))}
                type="button"
              >
                {t('Volver al admin', 'Back to admin')}
              </button>
            </div>
          ) : null}

          {evento === null ? null : (
            <div className="mb-2 flex items-center gap-3.5 rounded-2xl border border-line-panel bg-bg-raised p-2.5">
              {miniatura(60)}
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[20px] leading-tight font-medium">{evento.title}</span>
                <span className="block text-[13.5px] text-ink-mute">{evento.cuando ?? evento.planLabel}</span>
              </span>
              {evento.salirHref ? (
                <Link className="shrink-0 px-2 text-[14px] text-ink-mute no-underline hover:text-ink" href={evento.salirHref} onClick={cerrar}>
                  {t('Cambiar', 'Change')}
                </Link>
              ) : null}
            </div>
          )}

          {nav.conBuscador ? (
            <button
              className="mb-2 flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-[14px] border border-line-panel-strong bg-bg-raised px-4 text-left text-[16px] text-ink-mute"
              onClick={() => {
                cerrar()
                window.dispatchEvent(new Event(ABRIR_BUSCADOR))
              }}
              type="button"
            >
              {NAV_ICONS.buscar}
              {t('Buscar un evento, cliente o acción', 'Search for an event, client or action')}
            </button>
          ) : null}

          {sections.map((seccion) => (
            <nav aria-label={seccion.label} className="flex flex-col pt-3" key={seccion.label}>
              <p className="px-2 pb-1 text-[13px] font-medium text-gold-deep">{seccion.label}</p>
              {seccion.items.map((item) => {
                const activa = esEntradaActiva(item, ruta)
                const linea = descripcionDe(item, t)
                return (
                  <Link
                    aria-current={activa ? 'page' : undefined}
                    className={`flex min-h-[68px] items-center gap-3.5 rounded-[14px] px-2.5 py-1.5 text-ink no-underline ${activa ? 'bg-pill-maybe' : ''}`}
                    // En el celular, Ajustes abre su lista (M26), no la primera pestaña.
                    href={item.href === '/panel/admin/usuarios' ? '/panel/admin/ajustes' : item.href}
                    key={item.href}
                    onClick={cerrar}
                  >
                    <span
                      aria-hidden
                      className={`grid size-10 shrink-0 place-items-center rounded-full border ${activa ? 'border-shell-deep bg-shell-deep text-shell-ink' : 'border-line-panel bg-bg-raised text-shell-deep'}`}
                    >
                      {NAV_ICONS[item.icon]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-medium">{item.label}</span>
                      {linea ? <span className="block text-[13.5px] leading-snug text-ink-mute">{linea}</span> : null}
                    </span>
                    {item.count ? (
                      <span className="rounded-full bg-pill-pending px-2 text-[12.5px] leading-6 font-medium text-pill-pending-ink">
                        {item.count}
                        {item.countLabel ? <span className="sr-only"> {item.countLabel}</span> : null}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </nav>
          ))}

          {user.soporte ? null : (
            <Link className="mt-3 flex min-h-[68px] items-center gap-3.5 rounded-[14px] px-2.5 py-1.5 text-ink no-underline" href="/panel/cuenta" onClick={cerrar}>
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full border border-line-panel bg-bg-raised text-shell-deep">
                <svg aria-hidden className="size-[19px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.9-3.6 3.6-5.6 7-5.6s6.1 2 7 5.6" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium">{t('Mi cuenta', 'My account')}</span>
                <span className="block text-[13.5px] leading-snug text-ink-mute">{t('Tus datos y dónde tienes la sesión', 'Your details and where you are signed in')}</span>
              </span>
            </Link>
          )}
          {crear}
          <p className="px-2.5 pt-1 text-[13px] text-ink-mute">
            {user.nombre ?? user.email}, {user.rol}
          </p>
          {/* En modo soporte no se ofrece cerrar sesión: cerraría la del admin. La salida es «Volver al admin», arriba. */}
          {user.soporte ? null : (
            <ConfirmAction
              action={signOutAction}
              confirmLabel={t('Cerrar sesión', 'Sign out')}
              description={t('Saldrás del panel en este dispositivo. Para volver tendrás que entrar con tu correo y tu contraseña.', 'You will leave the panel on this device. To come back you will have to sign in with your email and password.')}
              title={t('Cerrar sesión', 'Sign out')}
              trigger={
                <>
                  <svg aria-hidden className="size-[19px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" viewBox="0 0 24 24">
                    <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
                  </svg>
                  {t('Cerrar sesión', 'Sign out')}
                </>
              }
              triggerClassName="mt-3 flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-line-panel-strong bg-bg-raised text-[16px] font-medium text-ink"
            />
          )}
        </div>
      </dialog>
    </>
  )
}
