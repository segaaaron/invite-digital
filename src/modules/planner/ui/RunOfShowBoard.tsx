'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useActionState, useEffect, useId } from 'react'
import { type DiaActionState, removeMomentAction, saveMomentAction } from '@/app/_acciones/planner/dia-actions'
import { ChevronIcon, ClockIcon } from '@/shared/design/ui/icons'
import { CampoHora } from '@/shared/design/ui/panel/campos-de-fecha'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { FIELD_CLASS, Field, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, EmptyState, SubmitButton } from '@/shared/design/ui/panel/estados'
import { Accion, type Evento, Ocultos } from './Accion'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: DiaActionState = { status: 'idle' }

export type MomentoVista = {
  readonly id: string
  readonly startsAt: string
  readonly durationMin: number
  readonly title: string
  readonly place: string | null
  readonly owner: string | null
  readonly vendorIds: readonly string[]
  readonly cue: string | null
  readonly notes: string | null
  /** «Se pisa con Brindis» o «Menos de 10 min tras Brindis», ya compuesto. */
  readonly aviso: string | null
  readonly enInvitacion: boolean
  readonly icono: string | null
}

/** Un icono del diseño de la invitación, ya dibujado por la página. */
export type IconoDeMomento = { readonly clave: string; readonly nombre: string; readonly dibujo: ReactNode }

/** Una fila del itinerario tal como la lee la invitación: hora, momento e icono. */
export type FilaDeInvitacion = { readonly time: string; readonly label: string; readonly icono: string | null }

type ProveedorCorto = { id: string; service: string }

function Dibujo({ iconos, clave, tam = 'size-8' }: { iconos: readonly IconoDeMomento[]; clave: string | null; tam?: string }) {
  const icono = iconos.find((i) => i.clave === clave)
  if (icono === undefined) return null
  return (
    <span aria-hidden className={`grid ${tam} place-items-center [&_img]:max-h-full [&_img]:max-w-full [&_svg]:max-h-full [&_svg]:max-w-full`}>
      {icono.dibujo}
    </span>
  )
}

/**
 * El momento, en un modal: lo que ven los invitados arriba —hora, nombre, icono— y lo que es
 * solo del equipo debajo. Se abre con `?momento=nuevo` o `?momento=<id>` y se cierra al guardar.
 */
export function MomentoDialog({
  evento,
  proveedores,
  momento,
  iconos,
  cerrarEn,
  ejemplo,
}: {
  evento: Evento
  proveedores: readonly ProveedorCorto[]
  momento?: MomentoVista | undefined
  iconos: readonly IconoDeMomento[]
  cerrarEn: string
  /** Un momento de esa fiesta (`Vocabulario.ejemplos.momento`): el vals no es de todas. */
  ejemplo: string
}) {
  const t = useT()
  const router = useRouter()
  const [estado, enviar, enviando] = useActionState(sinCaerse(saveMomentAction), INICIAL)
  const id = useId()
  useEffect(() => {
    if (estado.status === 'success') router.replace(cerrarEn)
  }, [estado, router, cerrarEn])

  const e = estado.status === 'error' ? estado.valores : undefined
  const v = (campo: string, base: string | number | null | undefined) => e?.[campo] ?? (base === null || base === undefined ? '' : String(base))
  // Un momento nuevo sale en la invitación salvo que se diga lo contrario: casi todos son para los invitados.
  const enInvitacion = e ? e.enInvitacion === 'on' : (momento?.enInvitacion ?? true)
  const icono = e?.icono ?? momento?.icono ?? null

  return (
    <PanelDialog closeHref={cerrarEn} title={momento ? t('Editar momento', 'Edit moment') : t('Añadir un momento', 'Add a moment')} width={520}>
      <form action={enviar} className="group flex flex-col gap-5" key={e ? JSON.stringify(e) : 'form'}>
        <Ocultos {...evento} extra={{ momentId: momento?.id ?? '' }} />

        <div className="grid gap-3 min-[560px]:grid-cols-[150px_1fr]">
          <Field htmlFor={`${id}-h`} label={t('Hora', 'Time')}>
            <CampoHora defaultValue={v('startsAt', momento?.startsAt)} id={`${id}-h`} name="startsAt" required />
          </Field>
          <Field htmlFor={`${id}-t`} label={t('Momento', 'Moment')}>
            <input className={FIELD_CLASS} defaultValue={v('title', momento?.title)} id={`${id}-t`} maxLength={160} name="title" placeholder={t(`Por ejemplo, ${ejemplo}`, `For example, ${ejemplo}`)} required />
          </Field>
        </div>

        {/* Sin estado propio: React vacía el formulario al guardar. Los iconos se enseñan por CSS con la casilla. */}
        <div className="flex flex-col gap-4 rounded-[16px] border border-line-panel bg-white p-4">
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] text-ink">{t('Mostrar en la invitación', 'Show on the invitation')}</span>
              <span className="text-[12px] leading-[1.5] text-ink-mute">{t('Tus invitados lo ven en el itinerario, con su hora y su icono.', 'Your guests see it in the itinerary, with its time and icon.')}</span>
            </span>
            <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0">
              <input className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0" defaultChecked={enInvitacion} name="enInvitacion" role="switch" type="checkbox" />
              <span aria-hidden className="h-6 w-11 rounded-full bg-line-panel-strong transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold" />
              <span aria-hidden className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 motion-reduce:transition-none" />
            </span>
          </label>
          {iconos.length > 0 ? (
            <fieldset className="hidden flex-col gap-2 border-t border-line-panel pt-4 group-has-[input[name=enInvitacion]:checked]:flex">
              <legend className="sr-only">{t('Icono en la invitación', 'Icon on the invitation')}</legend>
              <p aria-hidden className="text-[12px] text-ink-soft">
                {t('Icono, como lo dibuja tu diseño', 'Icon, as your design draws it')}
              </p>
              <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(84px,1fr))]">
                {iconos.map((opcion) => (
                  <label
                    className="flex cursor-pointer flex-col items-center gap-1.5 rounded-[12px] border border-line-panel bg-white px-1.5 py-2.5 text-ink transition hover:border-line-panel-strong has-checked:border-ink has-checked:bg-bg-top has-checked:ring-1 has-checked:ring-ink has-focus-visible:outline-2 has-focus-visible:outline-ink"
                    key={opcion.clave}
                  >
                    <input className="sr-only" defaultChecked={icono === opcion.clave} name="icono" type="radio" value={opcion.clave} />
                    <span aria-hidden className="grid size-11 place-items-center [&_img]:max-h-11 [&_img]:max-w-11 [&_svg]:max-h-11 [&_svg]:max-w-11">
                      {opcion.dibujo}
                    </span>
                    <span className="text-center text-[12px] leading-tight text-ink-soft">{opcion.nombre}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>

        <details className="group/equipo rounded-[16px] border border-line-panel bg-bg-top/40" open={momento !== undefined && Boolean(momento.place || momento.owner || momento.cue || momento.notes || momento.vendorIds.length)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13.5px] text-ink">
            <span className="flex flex-col gap-0.5">
              <span>{t('Para tu equipo', 'For your team')}</span>
              <span className="text-[12px] text-ink-mute">{t('Duración, lugar, responsable, canción y proveedores. Tus invitados no lo ven.', 'Duration, place, person in charge, song and vendors. Your guests don’t see it.')}</span>
            </span>
            <ChevronIcon className="size-4 shrink-0 text-ink-mute transition-transform group-open/equipo:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 border-t border-line-panel px-4 pt-3 pb-4">
            <div className="grid gap-3 min-[560px]:grid-cols-2">
              <Field htmlFor={`${id}-d`} label={t('Duración (minutos)', 'Duration (minutes)')}>
                <input className={FIELD_CLASS} defaultValue={v('durationMin', momento?.durationMin ?? 15)} id={`${id}-d`} inputMode="numeric" name="durationMin" required />
              </Field>
              <Field htmlFor={`${id}-l`} label={t('Dónde', 'Where')}>
                <input className={FIELD_CLASS} defaultValue={v('place', momento?.place)} id={`${id}-l`} maxLength={120} name="place" />
              </Field>
              <Field htmlFor={`${id}-r`} label={t('Responsable', 'Person in charge')}>
                <input className={FIELD_CLASS} defaultValue={v('owner', momento?.owner)} id={`${id}-r`} maxLength={120} name="owner" />
              </Field>
              <Field htmlFor={`${id}-c`} label={t('Canción o señal', 'Song or cue')}>
                <input className={FIELD_CLASS} defaultValue={v('cue', momento?.cue)} id={`${id}-c`} maxLength={200} name="cue" />
              </Field>
            </div>
            {proveedores.length === 0 ? null : (
              <fieldset className="flex flex-wrap gap-2">
                <legend className="mb-2 text-[12px] text-ink-soft">{t('Proveedores', 'Vendors')}</legend>
                {proveedores.map((p) => (
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line-panel bg-white px-3 py-1.5 text-[12.5px] text-ink has-checked:border-ink has-checked:bg-ink has-checked:text-white" key={p.id}>
                    <input className="sr-only" defaultChecked={momento?.vendorIds.includes(p.id) ?? false} name="vendorIds" type="checkbox" value={p.id} />
                    {p.service}
                  </label>
                ))}
              </fieldset>
            )}
            <Field htmlFor={`${id}-n`} label={t('Notas internas', 'Internal notes')}>
              <textarea className={FIELD_CLASS} defaultValue={v('notes', momento?.notes)} id={`${id}-n`} maxLength={2000} name="notes" rows={2} />
            </Field>
          </div>
        </details>

        <ActionFeedback errorsOnly state={estado} />
        <div className="flex items-center justify-end gap-3 border-t border-line-panel pt-4">
          <PanelButton href={cerrarEn}>{t('Cancelar', 'Cancel')}</PanelButton>
          <SubmitButton pending={enviando} pendingLabel={t('Guardando…', 'Saving…')} variant="primary">
            {momento ? t('Guardar cambios', 'Save changes') : t('Sumar momento', 'Add moment')}
          </SubmitButton>
        </div>
      </form>
      {momento ? (
        <div className="mt-4 flex justify-start">
          <Accion action={removeMomentAction} evento={evento} extra={{ momentId: momento.id }} label={t(`Quitar «${momento.title}»`, `Remove “${momento.title}”`)} variant="danger">
            {t('Quitar este momento', 'Remove this moment')}
          </Accion>
        </div>
      ) : null}
    </PanelDialog>
  )
}

/** Sin momentos todavía: qué es esta pantalla y el primer paso. */
export function CronogramaVacio({ nuevo }: { nuevo: string }) {
  const t = useT()
  // El mismo vacío que el resto del panel (16 oct: este era el único sin tarjeta).
  return (
    <EmptyState
      action={
        <PanelButton href={nuevo} variant="primary">
          {t('Sumar el primer momento', 'Add the first moment')}
        </PanelButton>
      }
      description={t('Suma cada momento con su hora: la misa, la entrada, el vals, la cena. Lo que marques para la invitación es el itinerario que ven tus invitados; lo demás queda para tu equipo.', 'Add each moment with its time: the mass, the entrance, the waltz, the dinner. What you check for the invitation is the itinerary your guests see; the rest stays with your team.')}
      icon={<ClockIcon />}
      title={t('Arma el cronograma de tu día', 'Build your day’s schedule')}
    />
  )
}

/**
 * El cronograma en orden de hora (E25): la hora en grande, el icono del momento, dónde o quién se encarga, si sale en
 * la invitación y «Editar». En el celular, unidos por una línea (M13). Los solapes y márgenes cortos, avisados.
 */
export function RunOfShowBoard({
  momentos,
  proveedores,
  iconos,
  editarEn,
}: {
  momentos: readonly MomentoVista[]
  proveedores: readonly ProveedorCorto[]
  iconos: readonly IconoDeMomento[]
  /** `?momento=` se le suma el id. */
  editarEn: string
}) {
  const t = useT()
  const nombre = (vid: string) => proveedores.find((p) => p.id === vid)?.service
  return (
    <ol className="flex flex-col">
      {momentos.map((m, i) => {
        const responsable = m.owner ?? m.vendorIds.map(nombre).filter(Boolean).join(', ')
        const detalle = [m.place, responsable ? `${t('Responsable', 'In charge')}: ${responsable}` : null, m.cue ? `♪ ${m.cue}` : null].filter(Boolean).join(' · ')
        return (
          <li
            aria-label={`${m.startsAt} ${m.title}`}
            className="group relative grid grid-cols-[72px_36px_minmax(0,1fr)] items-start gap-x-3 min-[768px]:grid-cols-[96px_44px_minmax(0,1fr)_auto] min-[768px]:items-center min-[768px]:border-b min-[768px]:border-line-panel min-[768px]:py-4"
            key={m.id}
          >
            <span className="font-display text-[26px] leading-none font-medium text-ink [font-variant-numeric:lining-nums_tabular-nums] max-[767px]:pt-1 min-[768px]:text-right min-[768px]:text-[32px]">
              {m.startsAt}
            </span>
            <span className="relative flex h-full justify-center">
              {i < momentos.length - 1 ? <span aria-hidden className="absolute top-5 -bottom-1 w-px bg-gold/60 min-[768px]:hidden" /> : null}
              <span
                className={`relative grid place-items-center rounded-full max-[767px]:mt-1.5 max-[767px]:size-4 max-[767px]:border-2 max-[767px]:border-gold max-[767px]:bg-bg min-[768px]:size-10 min-[768px]:border min-[768px]:border-line-panel-strong min-[768px]:bg-tarjeta min-[768px]:text-gold-deep`}
              >
                <span className="max-[767px]:hidden">
                  {m.icono && iconos.some((x) => x.clave === m.icono) ? <Dibujo clave={m.icono} iconos={iconos} tam="size-6" /> : <ClockIcon className="size-4" />}
                </span>
              </span>
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 max-[767px]:pb-6">
              <span className="text-[15.5px] font-medium text-ink max-[767px]:text-[17px]">{m.title}</span>
              {detalle ? <span className="text-[13.5px] text-ink-mute max-[767px]:text-[15px]">{detalle}</span> : null}
              <span className="mt-1.5 flex flex-wrap items-center gap-2 min-[768px]:hidden">
                <Pill tone={m.enInvitacion ? 'maybe' : 'neutro'}>{m.enInvitacion ? t('En la invitación', 'On the invitation') : t('Solo tu equipo', 'Team only')}</Pill>
                {m.aviso ? <Pill largo tone="no">{m.aviso}</Pill> : null}
              </span>
              {m.aviso ? (
                <span className="mt-1 max-[767px]:hidden">
                  <Pill largo tone="no">{m.aviso}</Pill>
                </span>
              ) : null}
            </div>
            <span className="flex items-center gap-5 max-[767px]:col-span-3 max-[767px]:hidden">
              <Pill tone={m.enInvitacion ? 'maybe' : 'neutro'}>{m.enInvitacion ? t('En la invitación', 'On the invitation') : t('Solo para tu equipo', 'Team only')}</Pill>
              <Link aria-label={t(`Editar ${m.title}`, `Edit ${m.title}`)} className="inline-flex min-h-11 min-w-11 items-center text-[14px] font-medium text-gold-deep no-underline hover:underline" href={`${editarEn}${m.id}`} scroll={false}>
                {t('Editar', 'Edit')}
              </Link>
            </span>
            {/* En el celular, la fila entera abre su edición. */}
            <Link aria-label={t(`Editar ${m.title}`, `Edit ${m.title}`)} className="absolute inset-0 min-[768px]:hidden" href={`${editarEn}${m.id}`} scroll={false} />
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Lo que ven los invitados (E25, «Así lo leen tus invitados»): el itinerario como lo pinta la invitación, centrado.
 * Sin momentos marcados, el ejemplo del diseño atenuado, y se dice.
 */
export function ItinerarioEnLaInvitacion({
  filas,
  ejemplo,
  vistaPrevia,
}: {
  filas: readonly FilaDeInvitacion[]
  ejemplo: readonly FilaDeInvitacion[]
  vistaPrevia: string
}) {
  const t = useT()
  const deEjemplo = filas.length === 0
  const lista = deEjemplo ? ejemplo : filas
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium">{t('Así lo leen tus invitados', 'How your guests read it')}</h2>
      {deEjemplo ? <p className="text-[13px] leading-[1.6] text-ink-mute">{t('Todavía no marcaste momentos: tus invitados ven el itinerario de ejemplo del diseño.', 'You haven’t checked any moments yet: your guests see the design’s sample itinerary.')}</p> : null}
      <Link className={`flex flex-col items-center gap-5 rounded-[16px] border border-line-panel bg-tarjeta px-6 py-7 text-center text-ink no-underline transition-colors hover:border-gold ${deEjemplo ? 'opacity-55' : ''}`} href={vistaPrevia}>
        <span className="text-[12px] tracking-[0.3em] text-ink-mute uppercase">{t('Itinerario', 'Itinerary')}</span>
        {lista.map((f, i) => (
          <span className="flex flex-col" key={`${f.time}-${f.label}-${i}`}>
            <span className="font-display text-[26px] leading-tight font-medium [font-variant-numeric:lining-nums_tabular-nums]">{f.time}</span>
            <span className="text-[13px] text-ink-mute">{f.label}</span>
          </span>
        ))}
        <span className="sr-only">{t('Ver en la invitación', 'View on the invitation')}</span>
      </Link>
    </div>
  )
}
