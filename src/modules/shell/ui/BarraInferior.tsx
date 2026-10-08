'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useRef } from 'react'
import { signOutAction } from '@/app/_acciones/identity/actions'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import { leaveSupportAction } from '@/app/_acciones/admin/support-actions'
import { esEntradaActiva, type ConfigDeBarra, type NavItem, type NavSection } from './nav'
import { NAV_ICONS } from './nav-icons'
import type { PanelUser } from './PanelSidebar'

/** Cuántas entradas van a la vista cuando quien monta la barra no las elige; el resto, en «Más». */
const A_LA_VISTA = 4

/**
 * **La navegación del panel en el celular, abajo y al alcance del pulgar** (barra de 3 a 5 destinos de
 * Material 3 y la barra de pestañas de Apple). La usa el admin —Hoy · Ventas · Eventos · Clientes— y,
 * desde el 6 de octubre, el panel del evento —Inicio · Invitados · **Enviar** · Ingreso—, que antes
 * escondía sus 19 opciones tras un «Menú» de texto corrido.
 *
 * «Más» abre una hoja con el resto **agrupado por sección y en botones con icono**, la salida del modo
 * soporte, la cuenta y cerrar sesión. Desde 860 px no se pinta: ahí está la barra lateral.
 */
export function BarraInferior({ sections, user, config = {} }: { sections: readonly NavSection[]; user: PanelUser; config?: ConfigDeBarra }) {
  const ruta = usePathname()
  const consulta = useSearchParams()
  const hoja = useRef<HTMLDialogElement>(null)
  const entradas = sections.flatMap((s) => s.items)
  const vista = config.vista ?? entradas.slice(0, A_LA_VISTA)
  const fuera = new Set([...vista.map((i) => i.href), config.centro?.href ?? ''])
  const grupos = sections.map((s) => ({ label: s.label, items: s.items.filter((i) => !fuera.has(i.href)) })).filter((g) => g.items.length > 0)
  const enResto = grupos.some((g) => g.items.some((item) => esEntradaActiva(item, ruta))) || ruta === '/panel/cuenta'
  const cerrar = () => hoja.current?.close()

  // La acción central va en medio: con cuatro a la vista, dos a cada lado.
  const mitad = Math.ceil(vista.length / 2)
  const izquierda = config.centro === undefined ? vista : vista.slice(0, mitad)
  const derecha = config.centro === undefined ? [] : vista.slice(mitad)
  const columnas = vista.length + (config.centro === undefined ? 0 : 1) + 1
  // Una entrada con consulta (`?panel=envio`) está activa con su ruta **y** su consulta.
  const activa = (item: NavItem) => {
    const [camino, query = ''] = item.href.split('?')
    if (query === '') return esEntradaActiva(item, ruta) && !(ruta === camino && consulta.get('panel') === 'envio')
    return ruta === camino && [...new URLSearchParams(query)].every(([k, v]) => consulta.get(k) === v)
  }

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-shell-deep/95 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),8px)] text-shell-ink shadow-[0_-12px_32px_rgb(0_0_0/0.22)] backdrop-blur-md min-[768px]:hidden print:hidden"
      >
        <ul className="grid items-end" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
          {izquierda.map((item) => (
            <li key={item.href}>
              <Entrada activa={activa(item)} item={item} />
            </li>
          ))}
          {config.centro === undefined ? null : (
            <li>
              <Central activa={activa(config.centro)} item={config.centro} />
            </li>
          )}
          {derecha.map((item) => (
            <li key={item.href}>
              <Entrada activa={activa(item)} item={item} />
            </li>
          ))}
          <li>
            <button
              aria-haspopup="dialog"
              className={`relative flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[12px] transition-colors ${enResto ? 'text-gold-light' : 'opacity-75'}`}
              onClick={() => hoja.current?.showModal()}
              type="button"
            >
              <svg aria-hidden className="size-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="19" cy="12" r="1.7" />
              </svg>
              Más
            </button>
          </li>
        </ul>
      </nav>

      {/* **En tableta (768–859 px), riel lateral** con los mismos destinos (maqueta 7 del panel móvil): la
          barra de abajo estirada a 820 px dejaba cinco iconos perdidos en el ancho. Desde 860, la barra lateral. */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col items-center gap-1 bg-shell-deep pt-[max(env(safe-area-inset-top),16px)] pb-4 text-shell-ink min-[768px]:max-[859px]:flex print:hidden"
      >
        <ul className="flex w-full flex-col items-stretch gap-1 px-1.5">
          {[...izquierda, ...(config.centro === undefined ? [] : [config.centro]), ...derecha].map((item) => (
            <li key={item.href}>
              <Entrada activa={activa(item)} item={item} riel />
            </li>
          ))}
          <li>
            <button
              aria-haspopup="dialog"
              className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[12px] ${enResto ? 'text-gold-light' : 'opacity-75'}`}
              onClick={() => hoja.current?.showModal()}
              type="button"
            >
              <svg aria-hidden className="size-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="19" cy="12" r="1.7" />
              </svg>
              Más
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        aria-label="Más secciones"
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-[26px] border-t border-line-panel bg-bg-raised p-0 text-ink shadow-lift backdrop:bg-ink/40 motion-safe:animate-slide-up"
        onClick={(e) => {
          if (e.target === hoja.current) cerrar()
        }}
        ref={hoja}
      >
        <div className="flex flex-col gap-1 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
          <span aria-hidden className="mx-auto mb-2 h-1 w-10 rounded-full bg-line-panel-strong" />
          {user.soporte ? (
            <div className="mb-2 flex items-center gap-3 rounded-2xl bg-shell-deep px-4 py-3 text-shell-ink">
              <p className="min-w-0 flex-1 text-[12.5px] leading-snug">
                <span className="font-mono text-[10.5px] tracking-[0.2em] text-gold-light uppercase">Soporte</span>
                <span className="block opacity-80">Lo que cambies queda a tu nombre.</span>
              </p>
              <button
                className="shrink-0 rounded-full bg-gold px-4 py-2.5 text-[12.5px] font-medium text-shell-deep"
                onClick={() => void leaveSupportAction().then((hecho) => hecho.status === 'ok' && window.location.assign(hecho.href))}
                type="button"
              >
                Regresar como admin
              </button>
            </div>
          ) : null}
          {grupos.map((grupo) => (
            <section aria-label={grupo.label} className="flex flex-col gap-2 pt-2" key={grupo.label}>
              <h2 className="px-1 font-mono text-[12px] tracking-[0.18em] text-gold-deep uppercase">{grupo.label}</h2>
              <ul className="grid grid-cols-3 gap-2">
                {grupo.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      aria-current={esEntradaActiva(item, ruta) ? 'page' : undefined}
                      className="relative flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border border-transparent bg-bg-sunken/60 px-2 py-3 text-center text-[12.5px] leading-tight transition-colors hover:bg-bg-sunken aria-[current=page]:border-gold/50 aria-[current=page]:bg-bg-top"
                      href={item.href}
                      onClick={cerrar}
                    >
                      <span aria-hidden className="flex size-6 items-center justify-center text-gold-deep [&>svg]:size-5.5">
                        {NAV_ICONS[item.icon]}
                      </span>
                      {item.label}
                      {item.count ? (
                        <span className="absolute top-2 right-2 min-w-5 rounded-full bg-sage px-1.5 text-center font-mono text-[10.5px] leading-5 text-white">
                          {item.count}
                          {item.countLabel ? <span className="sr-only"> {item.countLabel}</span> : null}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className="my-3 h-px bg-line-panel" />
          <p className="px-3 pb-1 text-[12.5px] text-ink-mute">
            {user.email} · {user.rol}
          </p>
          {user.soporte ? null : (
            <Link className="flex min-h-12 items-center rounded-xl px-3 text-[15px] transition-colors hover:bg-bg-sunken" href="/panel/cuenta" onClick={cerrar}>
              Mi cuenta
            </Link>
          )}
          <ConfirmAction
            action={signOutAction}
            confirmLabel="Cerrar sesión"
            description="Saldrás del panel en este dispositivo. Para volver tendrás que entrar con tu correo y tu contraseña."
            title="Cerrar sesión"
            trigger="Cerrar sesión"
            triggerClassName="flex min-h-12 w-full items-center rounded-xl px-3 text-left text-[15px] text-danger-deep transition-colors hover:bg-bg-sunken"
          />
        </div>
      </dialog>
    </>
  )
}

function Entrada({ item, activa, riel = false }: { item: NavItem; activa: boolean; riel?: boolean }) {
  return (
    <Link
      aria-current={activa ? 'page' : undefined}
      className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[12px] transition-colors ${riel ? 'min-h-14' : 'min-h-12'} ${activa ? (riel ? 'bg-white/10 text-gold-light' : 'text-gold-light') : 'opacity-75 hover:opacity-100'}`}
      href={item.href}
    >
      {activa && !riel ? <span aria-hidden className="absolute -top-1.5 h-0.5 w-6 rounded-full bg-gold" /> : null}
      <span aria-hidden className="flex size-5 items-center justify-center [&>svg]:size-5">
        {NAV_ICONS[item.icon]}
      </span>
      <span className="max-w-full truncate px-0.5">{item.label}</span>
      {item.count ? (
        <span className="absolute top-0 right-[calc(50%-20px)] min-w-5 rounded-full bg-sage px-1 text-center font-mono text-[12px] leading-5 text-white">
          {item.count}
          {item.countLabel ? <span className="sr-only"> {item.countLabel}</span> : null}
        </span>
      ) : null}
    </Link>
  )
}

/** La acción principal: un círculo dorado que sobresale de la barra, como el «+» de las apps de fotos. */
function Central({ item, activa }: { item: NavItem; activa: boolean }) {
  return (
    <Link
      aria-current={activa ? 'page' : undefined}
      className="relative flex min-h-12 flex-col items-center justify-end gap-1 pb-1.5 text-[12px] font-medium text-gold-light"
      href={item.href}
    >
      <span
        aria-hidden
        className="-mt-6 flex size-13 items-center justify-center rounded-full bg-linear-to-br from-gold-light to-gold text-shell-deep shadow-[0_10px_22px_-8px_rgb(0_0_0/0.6)] ring-4 ring-shell-deep [&>svg]:size-5.5"
      >
        {NAV_ICONS[item.icon]}
      </span>
      {item.label}
    </Link>
  )
}
