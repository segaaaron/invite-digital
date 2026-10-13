import { admin, orders } from '@/app/composition/container'
import Link from 'next/link'
import { hace } from '@/shared/format/fecha'
import { ShowcaseMusicRow } from '@/modules/admin'
import { fiestaDeCategoria } from '@/modules/events'
import { themeDefinitions } from '@/modules/events/ui/themes/registry'
import { CATALOG_LISTOS, seAsigna } from '@/shared/design/theme-catalog'
import { Ayuda } from '@/shared/design/ui/panel/estados'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PestanasDeAdmin } from '@/modules/admin'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { EyeIcon } from '@/shared/design/ui/icons'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Modelos · Administración' }
export const dynamic = 'force-dynamic'

/**
 * La música de los modelos del escaparate.
 *
 * **No es la música de una boda.** Lo que suena en una invitación de verdad vive en
 * `event_media`, pertenece a ese evento y lo sube su atelier o su cliente desde
 * Configuración. Esto otro es la web pública: los dieciséis que cualquiera mira antes de
 * comprar, y de esos responde una sola persona.
 *
 * El clásico no sale: no se publica en el catálogo, es el respaldo de una clave
 * desconocida.
 */
const FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'boda', label: 'Bodas' },
  { key: 'xv', label: 'XV años' },
  { key: 'cumple', label: 'Cumpleaños' },
  { key: 'retirados', label: 'Sin publicar' },
  { key: 'sin-musica', label: 'Sin música' },
] as const

export default async function AdminModelosPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  await requireAdmin()
  const pedido = (await searchParams).filtro
  const filtro = FILTROS.find((f) => f.key === pedido)?.key ?? 'todos'
  const ahora = new Date()

  const [musica, publicacion, canciones, aprobados] = await Promise.all([
    admin.showcaseMusic(),
    admin.publication(),
    admin.showcaseSongs(),
    orders.page({ status: 'approved', tope: 5000, prioridad: ['approved'] }),
  ])
  // Cuánto se vende cada modelo: lo que decide qué destacar y qué retirar.
  const ventas = new Map<string, { veces: number; ultima: Date | null }>()
  if (!isErr(aprobados)) {
    for (const { order: o } of aprobados.value.pedidos) {
      if (o.templateSlug === null) continue
      const a = ventas.get(o.templateSlug) ?? { veces: 0, ultima: null }
      ventas.set(o.templateSlug, { veces: a.veces + 1, ultima: a.ultima === null || (o.decidedAt ?? o.createdAt) > a.ultima ? (o.decidedAt ?? o.createdAt) : a.ultima })
    }
  }
  // Ni el clásico ni los retirados: un retirado no vuelve a la web desde aquí.
  const modelos = themeDefinitions().filter((tema) => seAsigna(tema.key))
  const fiestaDe = (clave: string) => fiestaDeCategoria(CATALOG_LISTOS.find((entrada) => entrada.key === clave)?.categorySlug ?? '')
  // Un grupo por fiesta, y solo los que tienen algún modelo: los cumpleaños son uno solo y
  // todavía sin publicar, así que el grupo aparece el día que existe.
  const pasa = (clave: string) => {
    if (isErr(musica) || isErr(publicacion)) return true
    if (filtro === 'boda' || filtro === 'xv' || filtro === 'cumple') return fiestaDe(clave) === filtro
    if (filtro === 'retirados') return publicacion.value[clave] !== true
    if (filtro === 'sin-musica') return (musica.value[clave] ?? '') === ''
    return true
  }
  const visibles = modelos.filter((tema) => pasa(tema.key))
  const cuenta = (key: (typeof FILTROS)[number]['key']) =>
    isErr(musica) || isErr(publicacion)
      ? 0
      : modelos.filter((tema) =>
          key === 'todos' ? true : key === 'retirados' ? publicacion.value[tema.key] !== true : key === 'sin-musica' ? (musica.value[tema.key] ?? '') === '' : fiestaDe(tema.key) === key,
        ).length

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton className="max-[767px]:hidden" external href="/es">
            <EyeIcon className="size-4" /> Ver la web
          </PanelButton>
        }
        meta="Lo que vende la web: diseños, planes y extras."
        pestanas={<PestanasDeAdmin />}
        title="Catálogo"
      />

      {/* Por fiesta a la izquierda; lo que no se vende, a la derecha (maqueta E05). */}
      <nav aria-label="Mostrar" className="mb-7 flex flex-wrap items-center gap-2.5">
        {FILTROS.map((f, i) => {
          const n = cuenta(f.key)
          if (f.key !== 'todos' && n === 0 && filtro !== f.key) return null
          return (
            <Link
              aria-current={filtro === f.key ? 'page' : undefined}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-medium no-underline max-[859px]:min-h-11 ${i === 4 ? 'ml-auto max-[559px]:ml-0' : ''} ${filtro === f.key ? 'border-shell-deep bg-shell-deep text-shell-ink' : 'border-line-panel-strong bg-bg-raised text-ink hover:border-gold'}`}
              href={f.key === 'todos' ? '/panel/admin/modelos' : `/panel/admin/modelos?filtro=${f.key}`}
              key={f.key}
            >
              {f.label} {n}
            </Link>
          )
        })}
      </nav>

      {isErr(musica) || isErr(publicacion) ? (
        <p className="text-[14px] text-danger" role="alert">
          No pudimos leer los modelos. La base no responde; vuelve a intentarlo en un momento.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-5.5 gap-y-7 max-[559px]:grid-cols-2 max-[559px]:gap-x-3.5">
          {visibles.map((tema) => (
            <ShowcaseMusicRow
              key={tema.key}
              coverSrc={`/templates/${tema.key}.avif`}
              fiesta={{ boda: 'Boda', xv: 'XV años', cumple: 'Cumpleaños' }[fiestaDe(tema.key)]}
              label={tema.label}
              themeKey={tema.key}
              cancion={canciones[tema.key] ?? null}
              tieneMusica={(musica.value[tema.key] ?? '') !== ''}
              // Sin fila en la base no sale en el catálogo: se lee como retirado.
              publicado={publicacion.value[tema.key] ?? false}
              ventas={(() => {
                const v = ventas.get(tema.key)
                return { veces: v?.veces ?? 0, ultima: v?.ultima == null ? null : hace(v.ultima, ahora) }
              })()}
            />
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Ayuda>
          <p>
            La canción de cada modelo suena en su muestra de <span className="font-mono">/modelos</span>, no en las invitaciones de los clientes, que
            tienen la suya. Sube la canción entera, en MP3, M4A o WAV: se ajusta sola en un MP3 ligero y suena en bucle hasta que quien mira el modelo
            la pausa. Si la grabación tiene dueño, publicarla es responsabilidad del atelier.
          </p>
        </Ayuda>
      </div>
    </>
  )
}
