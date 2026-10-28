import Link from 'next/link'
import { admin } from '@/app/composition/container'
import { themeDefinitions } from '@/modules/events/ui/themes/registry'
import { fechaEnBolivia, hora } from '@/shared/format/fecha'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PestanasDeAdmin } from '@/modules/admin'
import { isErr } from '@/shared/result'
import { EmptyState, LoadMoreLink } from '@/shared/design/ui/panel/estados'
import { fraseDeAuditoria, GRUPOS_DE_AUDITORIA, prefijosDeGrupo } from '@/modules/admin'
import { patronDeBusqueda } from '@/modules/admin/domain/busqueda'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { traducir } from '@/shared/i18n/en-ingles'
import type { Locale } from '@/shared/i18n/locales'
import { INTL, type T } from '@/shared/i18n/t'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Auditoría · Administración', 'Audit · Administration') }
}
export const dynamic = 'force-dynamic'


/** De cuántas en cuántas filas se enseña el registro. */
const PAGINA = 50

/**
 * El registro de la administración.
 *
 * Solo escrituras. **No se anota ninguna lectura**: eso sería un rastro de navegación del
 * atelier, y lo que no se escribe no se filtra.
 */
export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; quien?: string; tipo?: string; q?: string }>
}) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  await requireAdmin()
  const params = await searchParams
  // «Sobre qué» se lee con nombres: la clave de un evento o de un modelo no le dice nada a nadie.
  const todos = await admin.events()
  const eventos = new Map(isErr(todos) ? [] : todos.value.map((e) => [e.slug, e.title]))
  const modelos = new Map(themeDefinitions().map((tema) => [tema.key, tema.label]))
  // «Ver más» sube el tope en la dirección. Se pide una fila de más para saber si queda algo
  // detrás sin contar la tabla entera.
  const pedido = Number(params.n)
  const tope = Number.isInteger(pedido) && pedido > 0 ? Math.min(pedido, 2000) : PAGINA

  // Los filtros viven en la dirección (formulario GET): se enlazan y funcionan sin JavaScript.
  const actores = await admin.auditActors()
  const quien = params.quien !== undefined && actores.includes(params.quien) ? params.quien : undefined
  const tipo = prefijosDeGrupo(params.tipo) === null ? undefined : params.tipo
  const q = (params.q ?? '').trim()
  const patron = patronDeBusqueda(q) ?? undefined
  const filtrando = quien !== undefined || tipo !== undefined || patron !== undefined
  const enlace = (n?: number) => {
    const u = new URLSearchParams()
    if (quien !== undefined) u.set('quien', quien)
    if (tipo !== undefined) u.set('tipo', tipo)
    if (q !== '') u.set('q', q)
    if (n !== undefined) u.set('n', String(n))
    const cadena = u.toString()
    return cadena === '' ? '/dashboard/admin/audit' : `/dashboard/admin/audit?${cadena}`
  }

  const leido = await admin.audit(tope + 1, { actorEmail: quien, prefijos: prefijosDeGrupo(tipo) ?? undefined, patron })
  const registro = isErr(leido) ? leido : { ...leido, value: leido.value.slice(0, tope) }
  const hayMas = !isErr(leido) && leido.value.length > tope

  return (
    <>
      <PanelHeader title={t('Auditoría', 'Audit')} pestanas={<PestanasDeAdmin />}
      />

      <form action="/dashboard/admin/audit" className="mb-8 grid gap-3 min-[760px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] min-[760px]:items-end" method="get" role="search">
        <label className="flex flex-col gap-2">
          <span className={LABEL_CLASS}>{t('Quién', 'Who')}</span>
          <select className={FIELD_CLASS} defaultValue={quien ?? ''} name="quien">
            <option value="">{t('Todos', 'All')}</option>
            {actores.map((correo) => (
              <option key={correo} value={correo}>
                {correo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={LABEL_CLASS}>{t('Qué', 'What')}</span>
          <select className={FIELD_CLASS} defaultValue={tipo ?? ''} name="tipo">
            <option value="">{t('Todos', 'All')}</option>
            {GRUPOS_DE_AUDITORIA.map((g) => (
              <option key={g.clave} value={g.clave}>
                {traducir(g.titulo, t)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={LABEL_CLASS}>{t('Sobre qué', 'About what')}</span>
          <input className={FIELD_CLASS} defaultValue={q} name="q" placeholder={t('Evento, cliente o plan', 'Event, client or plan')} type="search" />
        </label>
        <span className="flex gap-2">
          <PanelButton type="submit" variant="primary">
            {t('Filtrar', 'Filter')}
          </PanelButton>
          {filtrando ? <PanelButton href="/dashboard/admin/audit">{t('Quitar filtros', 'Clear filters')}</PanelButton> : null}
        </span>
      </form>

      {isErr(registro) ? (
        <p className="text-[14px] text-danger" role="alert">
          {t('No pudimos leer la auditoría. La base no responde; vuelve a intentarlo en un momento.', 'We could not read the audit log. The database is not responding; try again in a moment.')}
        </p>
      ) : registro.value.length === 0 ? (
        filtrando ? (
          <EmptyState compact description={t('Prueba con otro tipo, otra persona o menos texto.', 'Try another type, another person or less text.')} title={t('Nada con estos filtros', 'Nothing with these filters')} />
        ) : (
          <EmptyState compact description={t('Cada vez que alguien del equipo crea, cambia o borra algo, queda aquí.', 'Every time someone on the team creates, changes or deletes something, it stays here.')} title={t('Todavía no hay nada anotado', 'Nothing recorded yet')} />
        )
      ) : (
        <div className="flex flex-col gap-8">
          {/* Por día, como en la maqueta (E17): «Hoy», «Ayer» y la fecha; cada fila, a qué hora, quién, qué hizo y sobre qué. */}
          {porDia(registro.value).map(([dia, filas]) => (
            <section aria-label={tituloDelDia(dia, t, locale)} key={dia}>
              <h2 className="mb-2.5 font-display text-[22px] font-medium">{tituloDelDia(dia, t, locale)}</h2>
              <div className="hidden grid-cols-[70px_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)] gap-3 border-b border-line-panel-strong px-3.5 pb-2.5 text-[13px] font-medium text-ink-mute min-[760px]:grid">
                <span>{t('Hora', 'Time')}</span>
                <span>{t('Quién', 'Who')}</span>
                <span>{t('Qué hizo', 'What they did')}</span>
                <span>{t('Sobre', 'About')}</span>
              </div>
              <ul>
                {filas.map((fila) => (
                  <li
                    className="grid gap-1 border-b border-line-panel px-3.5 py-3 text-[14.5px] min-[760px]:grid-cols-[70px_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)] min-[760px]:items-baseline min-[760px]:gap-3 max-[759px]:px-0"
                    key={fila.id}
                  >
                    <span className="order-3 text-[13px] whitespace-nowrap text-ink-mute [font-variant-numeric:tabular-nums] min-[760px]:order-none">{hora(fila.createdAt)}</span>
                    <span className="order-3 truncate text-[13px] text-ink-mute min-[760px]:order-none min-[760px]:text-[14.5px] min-[760px]:text-ink">{fila.actorEmail}</span>
                    <span className="order-1 min-[760px]:order-none">{traducir(fraseDeAuditoria(fila.action), t)}</span>
                    <span className="order-2 break-words min-[760px]:order-none">
                      {/* La huella de un fallo no le dice nada a nadie: lo que se borró va en el detalle. */}
                      <Sobre modelos={modelos} eventos={eventos} sujeto={fila.action === 'fallos.borrados' ? null : fila.subject} />
                      {fila.detail === null ? null : <span className="text-ink-mute">{fila.subject === null || fila.action === 'fallos.borrados' ? '' : ' · '}{fila.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {hayMas ? (
            <div className="flex justify-center">
              <LoadMoreLink href={enlace(tope + PAGINA)} noun={t('cambios', 'changes')} />
            </div>
          ) : null}
        </div>
      )}
    </>
  )
}

/** Las filas juntas por su día en Bolivia, del más reciente al más viejo. */
function porDia<T extends { createdAt: Date }>(filas: readonly T[]): [string, T[]][] {
  const dias = new Map<string, T[]>()
  for (const f of filas) {
    const dia = fechaEnBolivia(f.createdAt)
    dias.set(dia, [...(dias.get(dia) ?? []), f])
  }
  return [...dias.entries()]
}

/** «Hoy», «Ayer» o «12 de octubre». */
function tituloDelDia(dia: string, t: T, locale: Locale): string {
  const hoy = fechaEnBolivia(new Date())
  const ayer = fechaEnBolivia(new Date(Date.now() - 86_400_000))
  if (dia === hoy) return t('Hoy', 'Today')
  if (dia === ayer) return t('Ayer', 'Yesterday')
  return dia_(locale).format(new Date(`${dia}T12:00:00Z`))
}

const dia_ = (locale: Locale) => new Intl.DateTimeFormat(INTL[locale], { day: 'numeric', month: 'long', timeZone: 'UTC' })

/** El sujeto de una fila con su nombre: un evento enlaza a su ficha; un modelo dice cómo se llama. */
function Sobre({ sujeto, eventos, modelos }: { sujeto: string | null; eventos: ReadonlyMap<string, string>; modelos: ReadonlyMap<string, string> }) {
  if (sujeto === null) return null
  // Lo hecho en modo soporte guarda la dirección (`/dashboard/events/<slug>/guests`): se dice con el nombre del evento.
  const ruta = /^\/panel\/eventos\/([^/?#]+)/.exec(sujeto)
  const slug = ruta?.[1] ?? sujeto
  const evento = eventos.get(slug)
  if (evento !== undefined) {
    return (
      <Link className="text-gold-deep underline underline-offset-4 max-[859px]:inline-flex max-[859px]:min-h-11 max-[859px]:items-center" href={`/dashboard/events/${slug}/setup`}>
        {evento}
      </Link>
    )
  }
  return <>{modelos.get(sujeto) ?? sujeto}</>
}
