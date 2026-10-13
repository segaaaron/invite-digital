import Link from 'next/link'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { CardIcon, ChevronIcon, ClockIcon, GlobeIcon, MessageIcon, ShieldIcon, SparkIcon, UsersIcon } from '@/shared/design/ui/icons'

export const metadata = { title: 'Ajustes · Administración' }
export const dynamic = 'force-dynamic'

const ENTRADAS = [
  { href: '/panel/admin/fallos', titulo: 'Registro de fallos', detalle: 'Lo que se rompió, en palabras', Icono: ShieldIcon },
  { href: '/panel/admin/usuarios', titulo: 'Equipo', detalle: 'Quién trabaja en el atelier', Icono: UsersIcon },
  { href: '/panel/admin/pagos', titulo: 'Cobros', detalle: 'Cuenta y QR para las transferencias', Icono: CardIcon },
  { href: '/panel/admin/asistente', titulo: 'Asistente Luxury', detalle: 'Planes, límites y gasto del mes', Icono: SparkIcon },
  { href: '/panel/admin/web', titulo: 'La web', detalle: 'Contacto, testimonios y textos', Icono: GlobeIcon },
  { href: '/panel/admin/mensajes', titulo: 'Mensajes y agenda', detalle: 'Plantillas y capacidad por fin de semana', Icono: MessageIcon },
  { href: '/panel/admin/auditoria', titulo: 'Auditoría', detalle: 'Quién cambió qué y cuándo', Icono: ClockIcon },
] as const

/**
 * **Ajustes en el celular** (maqueta M26): la lista de los ajustes, cada uno con lo que trae, y cada uno abre su
 * pantalla con «← Ajustes» arriba. En la computadora, Ajustes son pestañas (E06); esta lista también sirve allí.
 */
export default async function AjustesPage() {
  await requireAdmin()
  return (
    <>
      <PanelHeader title="Ajustes" />
      <ul className="flex max-w-[720px] flex-col">
        {ENTRADAS.map(({ href, titulo, detalle, Icono }) => (
          <li className="border-b border-line-panel last:border-b-0" key={href}>
            <Link className="flex min-h-[72px] items-center gap-4 py-3 text-ink no-underline" href={href}>
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-pill-pending text-gold-deep">
                <Icono className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15.5px] font-medium">{titulo}</span>
                <span className="text-[13.5px] text-ink-mute">{detalle}</span>
              </span>
              <ChevronIcon className="size-4 shrink-0 -rotate-90 text-ink-mute" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

