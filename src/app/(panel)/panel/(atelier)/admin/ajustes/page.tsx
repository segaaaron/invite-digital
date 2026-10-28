import Link from 'next/link'
import { admin } from '@/app/composition/container'
import { isErr } from '@/shared/result'
import { cuantosTiposDeFallo } from '@/shared/observability/lectura'
import { Pill } from '@/shared/design/ui/panel/PanelKit'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { CardIcon, ChevronIcon, ClockIcon, GlobeIcon, MessageIcon, ShieldIcon, SparkIcon, UsersIcon } from '@/shared/design/ui/icons'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Ajustes · Administración', 'Settings · Administration') }
}
export const dynamic = 'force-dynamic'

const ENTRADAS = [
  { href: '/dashboard/admin/users', titulo: 'Equipo', detalle: 'Quién trabaja en el atelier', Icono: UsersIcon },
  { href: '/dashboard/admin/payments', titulo: 'Cobros', detalle: 'Cuenta y QR para las transferencias', Icono: CardIcon },
  { href: '/dashboard/admin/web', titulo: 'La web', detalle: 'Contacto, testimonios y textos', Icono: GlobeIcon },
  { href: '/dashboard/admin/messages', titulo: 'Mensajes y agenda', detalle: 'Plantillas y capacidad por fin de semana', Icono: MessageIcon },
  { href: '/dashboard/admin/assistant', titulo: 'Asistente Luxury', detalle: 'Planes, límites y gasto del mes', Icono: SparkIcon },
  { href: '/dashboard/admin/errors', titulo: 'Registro de fallos', detalle: 'Lo que se rompió, en palabras', Icono: ShieldIcon },
  { href: '/dashboard/admin/audit', titulo: 'Auditoría', detalle: 'Quién cambió qué y cuándo', Icono: ClockIcon },
] as const

/**
 * **Ajustes en el celular** (maqueta M26): la lista de los ajustes, cada uno con lo que trae, y cada uno abre su
 * pantalla con «← Ajustes» arriba. En la computadora, Ajustes son pestañas (E06); esta lista también sirve allí.
 */
export default async function AjustesPage() {
  const t = await tr()
  await requireAdmin()
  // Lo que falta se ve desde la lista: sin banco, titular y cuenta, quien recibe una cotización no sabe a dónde pagar.
  const cobro = await admin.payment()
  const faltaCobro = isErr(cobro) || cobro.value.bank === '' || cobro.value.accountHolder === '' || cobro.value.accountNumber === ''
  // Los de la última semana, como abre el registro.
  const fallos = await cuantosTiposDeFallo(7).catch(() => 0)
  const aviso: Record<string, string | null> = {
    '/dashboard/admin/payments': faltaCobro ? t('Faltan datos', 'Missing details') : null,
    '/dashboard/admin/errors': fallos > 0 ? (fallos === 1 ? t('1 por revisar', '1 to review') : t(`${fallos} por revisar`, `${fallos} to review`)) : null,
  }
  return (
    <>
      <PanelHeader title={t('Ajustes', 'Settings')} />
      <ul className="flex max-w-[720px] flex-col">
        {ENTRADAS.map(({ href, titulo, detalle, Icono }) => (
          <li className="border-b border-line-panel last:border-b-0" key={href}>
            <Link className="flex min-h-[72px] items-center gap-4 py-3 text-ink no-underline" href={href}>
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-pill-pending text-gold-deep">
                <Icono className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15.5px] font-medium">{traducir(titulo, t)}</span>
                <span className="text-[13.5px] text-ink-mute">{traducir(detalle, t)}</span>
              </span>
              {aviso[href] ? <Pill tone="no">{aviso[href]}</Pill> : null}
              <ChevronIcon className="size-4 shrink-0 -rotate-90 text-ink-mute" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

