'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { leaveSupportAction } from '@/app/_acciones/admin/support-actions'
import { signOutAction } from '@/app/_acciones/identity/actions'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import { ABRIR_BUSCADOR } from '@/shared/design/ui/panel/avisos-del-panel'
import { esEntradaActiva, type NavItem, type NavSection } from './nav'
import { NAV_ICONS } from './nav-icons'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * **Quién ha entrado**, siempre. La tarjeta enseñaba el nombre del evento abierto y parecía
 * que el admin había entrado con la cuenta del cliente.
 */
export type PanelUser = {
  readonly email: string
  /** Su nombre, si la cuenta lo tiene; sin él, la tarjeta firma con el correo. */
  readonly nombre: string | null
  readonly rol: string
  /** El admin actúa como el cliente: la tarjeta lo dice y lleva la salida. */
  readonly soporte: boolean
}

/** El evento en el que se está trabajando, con su salida si hay adónde volver. */
export type PanelEvento = {
  readonly title: string
  readonly planLabel: string
  readonly salirHref: string | null
  readonly salirLabel: string
  /** «Boda, sáb 18 de octubre»: qué fiesta y cuándo, bajo el nombre. */
  readonly cuando?: string
  /** La portada del diseño, en miniatura junto al nombre. */
  readonly portada?: string | null
}

/** Nombre y apellido a dos iniciales; un correo, a su primera letra. */
export const iniciales = (user: PanelUser): string => {
  const partes = (user.nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return user.email.slice(0, 1).toUpperCase()
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '')).toUpperCase()
}


/** El sello de la marca: monograma LA en latón bruñido, como el lacre de un sobre. */
export function SelloLA({ size = 48 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--color-laton-brillo)_0%,var(--color-gold)_40%,var(--color-gold-deep)_80%,var(--color-laton-sombra)_100%)] font-display font-semibold text-[color:var(--color-laton-sombra)] shadow-[inset_0_0_0_3px_rgb(255_255_255/0.08),inset_0_0_0_4.5px_rgb(12_36_32/0.35),0_6px_14px_rgb(0_0_0/0.35)]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      LA
    </span>
  )
}

function Insignia({ item }: { item: NavItem }) {
  if (!item.count) return null
  return (
    <span className="ml-auto rounded-full bg-gold px-2 text-[12px] leading-[19px] font-semibold text-shell-deep">
      {item.count}
      {item.countLabel ? <span className="sr-only"> {item.countLabel}</span> : null}
    </span>
  )
}

/**
 * **La barra lateral de la maqueta «Esmeralda y Latón»** (12 de octubre), solo en escritorio (≥ 1280 px).
 *
 * - Fuera de un evento: el sello grande con «Panel del atelier», el buscador (⌘K) si quien entra es admin, y los
 *   grupos Principal · Vender · Organizar · Configurar.
 * - Dentro de uno: el sello pequeño y la tarjeta del evento —su portada, el nombre y qué fiesta y cuándo—, que
 *   lleva a «Mis eventos» o a la cartera; debajo, sus grupos.
 * - Abajo, quien entró: iniciales, nombre, «Mi cuenta» y la salida.
 *
 * La sección activa se deduce de la ruta con `usePathname`, no de un prop que cada página tenía que pasar.
 */
export function PanelSidebar({
  sections,
  brandSub,
  user,
  evento,
  conBuscador = false,
}: {
  sections: readonly NavSection[]
  brandSub: string
  user: PanelUser
  evento: PanelEvento | null
  /** El buscador ⌘K: solo el admin lo tiene. */
  conBuscador?: boolean
  /** Ya no se usa: la campana vive en la barra de arriba. */
  conAcciones?: boolean
}) {
  const t = useT()
  const pathname = usePathname()

  return (
    <aside
      aria-label={evento === null ? t('Menú del panel', 'Panel menu') : t('Menú del evento', 'Event menu')}
      className="sticky top-0 flex h-dvh flex-col overflow-y-auto bg-shell-deep bg-[radial-gradient(140%_60%_at_0%_0%,var(--color-shell)_0%,var(--color-shell-deep)_60%)] px-4.5 pt-6.5 pb-5.5 text-shell-soft"
    >
      {evento === null ? (
        <>
          <Link className="flex items-center gap-3.5 px-2 text-shell-ink no-underline" href={sections[0]?.items[0]?.href ?? '/dashboard'}>
            <SelloLA />
            <span className="min-w-0">
              <span className="block font-display text-[21px] leading-[1.05] font-medium">Luxury Atelier</span>
              <span className="block text-[12.5px] text-shell-mute">{brandSub === 'ADMINISTRACIÓN' ? t('Panel del atelier', 'Atelier panel') : brandSub === 'PANEL' ? t('Tu panel', 'Your panel') : brandSub}</span>
            </span>
          </Link>
          {conBuscador ? (
            <button
              className="mt-5 flex min-h-[42px] cursor-pointer items-center justify-between rounded-[10px] border border-gold-light/28 bg-shell-ink/5 px-3 text-[14px] text-shell-buscar transition-colors hover:border-gold-light/50"
              onClick={() => window.dispatchEvent(new Event(ABRIR_BUSCADOR))}
              type="button"
            >
              <span className="inline-flex items-center gap-2.5">
                {NAV_ICONS.buscar}
                {t('Buscar o ir a…', 'Search or go to…')}
              </span>
              <kbd className="font-sans text-[12px] font-medium text-gold-light">⌘K</kbd>
            </button>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 px-2 pb-4.5">
            <SelloLA size={34} />
            <span className="font-display text-[17px] font-medium text-shell-ink">Luxury Atelier</span>
          </div>
          {evento.salirHref === null ? (
            <TarjetaDelEvento evento={evento} />
          ) : (
            <Link
              aria-label={`${evento.title}. ${evento.salirLabel}`}
              className="block rounded-xl no-underline transition-colors hover:bg-shell-ink/5"
              href={evento.salirHref}
            >
              <TarjetaDelEvento conFlecha evento={evento} />
            </Link>
          )}
        </>
      )}

      {sections.map((section) => (
        <nav aria-label={section.label} className="flex flex-col" key={section.label}>
          <p className="mx-3 mt-4.5 mb-1 text-[12.5px] tracking-[0.02em] text-gold-light">{section.label}</p>
          {section.items.map((item) => {
            const activa = esEntradaActiva(item, pathname)
            return (
              <Link
                aria-current={activa ? 'page' : undefined}
                className={`flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-[14.5px] font-medium no-underline transition-colors motion-reduce:transition-none ${
                  activa ? 'bg-bg text-shell-deep' : 'text-shell-soft hover:bg-shell-ink/7 hover:text-shell-ink'
                }`}
                href={item.href}
                key={item.href}
              >
                <span aria-hidden className="flex shrink-0">
                  {NAV_ICONS[item.icon]}
                </span>
                {item.label}
                <Insignia item={item} />
              </Link>
            )
          })}
        </nav>
      ))}

      <div className="mt-auto pt-6">
        <div aria-hidden className="mx-3 mb-4 h-[3px] border-y border-gold-light/45" />
        <TarjetaDeUsuario user={user} />
      </div>
    </aside>
  )
}

function TarjetaDelEvento({ evento, conFlecha = false }: { evento: PanelEvento; conFlecha?: boolean }) {
  return (
    <span className="flex items-center gap-3 rounded-xl border border-gold-light/28 bg-shell-ink/5 px-2.5 py-2 text-shell-ink">
      {evento.portada ? (
        // Miniatura decorativa: el nombre del evento va al lado, en texto.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="h-[54px] w-9 shrink-0 rounded-[5px] object-cover" src={evento.portada} />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[17px] leading-[1.15] font-medium">{evento.title}</span>
        <span className="block text-[12.5px] text-shell-mute">{evento.cuando ?? evento.planLabel}</span>
      </span>
      {conFlecha ? (
        <svg aria-hidden className="size-[17px] shrink-0 text-gold-light" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" />
        </svg>
      ) : null}
    </span>
  )
}

/** Quien entró: iniciales, nombre, «Mi cuenta» y la salida, como en la maqueta. */
function TarjetaDeUsuario({ user }: { user: PanelUser }) {
  const t = useT()
  return (
    <div className="flex items-center gap-3 px-2.5">
      <span aria-hidden className="grid size-[38px] shrink-0 place-items-center rounded-full bg-avatar text-[13px] font-semibold text-shell-deep">
        {iniciales(user)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-shell-ink">{user.nombre ?? user.email}</span>
        {user.soporte ? (
          // En modo soporte, la segunda salida (la otra es la franja de arriba). Navega el navegador: con
          // `redirect` el destino se pintaba con el actor de antes.
          <button
            className="min-h-8 cursor-pointer text-left text-[12.5px] font-medium text-gold-light hover:text-shell-ink"
            onClick={() => void leaveSupportAction().then((hecho) => hecho.status === 'ok' && window.location.assign(hecho.href))}
            type="button"
          >
            {t('Volver al admin', 'Back to admin')}
          </button>
        ) : (
          <Link className="text-[12.5px] text-shell-mute no-underline hover:text-shell-ink" href="/dashboard/account">
            {t('Mi cuenta', 'My account')}
          </Link>
        )}
      </span>
      {/* En modo soporte no: cerraría la sesión del admin, no la del cliente. */}
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
              <span className="sr-only">{t('Cerrar sesión', 'Sign out')}</span>
            </>
          }
          triggerClassName="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-shell-mute transition-colors hover:bg-shell-ink/7 hover:text-shell-ink"
        />
      )}
    </div>
  )
}
