'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useActionState, useEffect, useId } from 'react'
import { type DiaActionState, removeMomentAction, saveMomentAction } from '@/app/_acciones/planner/dia-actions'
import { ChevronIcon, ClockIcon, EyeIcon, PenIcon } from '@/shared/design/ui/icons'
import { CampoHora } from '@/shared/design/ui/panel/campos-de-fecha'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { FIELD_CLASS, Field, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { Accion, type Evento, Ocultos } from './Accion'

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
  const router = useRouter()
  const [estado, enviar, enviando] = useActionState(saveMomentAction, INICIAL)
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
    <PanelDialog closeHref={cerrarEn} title={momento ? 'Editar momento' : 'Nuevo momento'} width={640}>
      <form action={enviar} className="group flex flex-col gap-5" key={e ? JSON.stringify(e) : 'form'}>
        <Ocultos {...evento} extra={{ momentId: momento?.id ?? '' }} />

        <div className="grid gap-3 min-[560px]:grid-cols-[150px_1fr]">
          <Field htmlFor={`${id}-h`} label="Hora">
            <CampoHora defaultValue={v('startsAt', momento?.startsAt)} id={`${id}-h`} name="startsAt" required />
          </Field>
          <Field htmlFor={`${id}-t`} label="Momento">
            <input className={FIELD_CLASS} defaultValue={v('title', momento?.title)} id={`${id}-t`} maxLength={160} name="title" placeholder={`Por ejemplo, ${ejemplo}`} required />
          </Field>
        </div>

        {/* Sin estado propio: React vacía el formulario al guardar. Los iconos se enseñan por CSS con la casilla. */}
        <div className="flex flex-col gap-4 rounded-[16px] border border-line-panel bg-white p-4">
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] text-ink">Mostrar en la invitación</span>
              <span className="text-[12px] leading-[1.5] text-ink-mute">Tus invitados lo ven en el itinerario, con su hora y su icono.</span>
            </span>
            <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0">
              <input className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0" defaultChecked={enInvitacion} name="enInvitacion" role="switch" type="checkbox" />
              <span aria-hidden className="h-6 w-11 rounded-full bg-line-panel-strong transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold" />
              <span aria-hidden className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 motion-reduce:transition-none" />
            </span>
          </label>
          {iconos.length > 0 ? (
            <fieldset className="hidden flex-col gap-2 border-t border-line-panel pt-4 group-has-[input[name=enInvitacion]:checked]:flex">
              <legend className="sr-only">Icono en la invitación</legend>
              <p aria-hidden className="text-[12px] text-ink-soft">
                Icono, como lo dibuja tu diseño
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
                    <span className="text-center text-[11px] leading-tight text-ink-soft">{opcion.nombre}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>

        <details className="group/equipo rounded-[16px] border border-line-panel bg-bg-top/40" open={momento !== undefined && Boolean(momento.place || momento.owner || momento.cue || momento.notes || momento.vendorIds.length)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13.5px] text-ink">
            <span className="flex flex-col gap-0.5">
              <span>Para tu equipo</span>
              <span className="text-[12px] text-ink-mute">Duración, lugar, responsable, canción y proveedores. Tus invitados no lo ven.</span>
            </span>
            <ChevronIcon className="size-4 shrink-0 text-ink-mute transition-transform group-open/equipo:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 border-t border-line-panel px-4 pt-3 pb-4">
            <div className="grid gap-3 min-[560px]:grid-cols-2">
              <Field htmlFor={`${id}-d`} label="Duración (minutos)">
                <input className={FIELD_CLASS} defaultValue={v('durationMin', momento?.durationMin ?? 15)} id={`${id}-d`} inputMode="numeric" name="durationMin" required />
              </Field>
              <Field htmlFor={`${id}-l`} label="Dónde">
                <input className={FIELD_CLASS} defaultValue={v('place', momento?.place)} id={`${id}-l`} maxLength={120} name="place" />
              </Field>
              <Field htmlFor={`${id}-r`} label="Responsable">
                <input className={FIELD_CLASS} defaultValue={v('owner', momento?.owner)} id={`${id}-r`} maxLength={120} name="owner" />
              </Field>
              <Field htmlFor={`${id}-c`} label="Canción o señal">
                <input className={FIELD_CLASS} defaultValue={v('cue', momento?.cue)} id={`${id}-c`} maxLength={200} name="cue" />
              </Field>
            </div>
            {proveedores.length === 0 ? null : (
              <fieldset className="flex flex-wrap gap-2">
                <legend className="mb-2 text-[12px] text-ink-soft">Proveedores</legend>
                {proveedores.map((p) => (
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line-panel bg-white px-3 py-1.5 text-[12.5px] text-ink has-checked:border-ink has-checked:bg-ink has-checked:text-white" key={p.id}>
                    <input className="sr-only" defaultChecked={momento?.vendorIds.includes(p.id) ?? false} name="vendorIds" type="checkbox" value={p.id} />
                    {p.service}
                  </label>
                ))}
              </fieldset>
            )}
            <Field htmlFor={`${id}-n`} label="Notas internas">
              <textarea className={FIELD_CLASS} defaultValue={v('notes', momento?.notes)} id={`${id}-n`} maxLength={2000} name="notes" rows={2} />
            </Field>
          </div>
        </details>

        <ActionFeedback errorsOnly state={estado} />
        <div className="flex items-center justify-end gap-3 border-t border-line-panel pt-4">
          <PanelButton href={cerrarEn}>Cancelar</PanelButton>
          <SubmitButton pending={enviando} pendingLabel="Guardando…" variant="primary">
            {momento ? 'Guardar cambios' : 'Sumar momento'}
          </SubmitButton>
        </div>
      </form>
      {momento ? (
        <div className="mt-4 flex justify-start">
          <Accion action={removeMomentAction} evento={evento} extra={{ momentId: momento.id }} label={`Quitar «${momento.title}»`} variant="danger">
            Quitar este momento
          </Accion>
        </div>
      ) : null}
    </PanelDialog>
  )
}

/** Sin momentos todavía: qué es esta pantalla y el primer paso. */
export function CronogramaVacio({ nuevo }: { nuevo: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
      <span aria-hidden className="grid size-14 place-items-center rounded-full bg-bg-top text-ink-soft">
        <ClockIcon className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[26px] leading-tight font-light text-ink">Arma el cronograma de tu día</h2>
        <p className="max-w-[54ch] text-[13.5px] leading-[1.7] text-ink-soft">
          Suma cada momento con su hora: la misa, la entrada, el vals, la cena. Lo que marques para la invitación es el itinerario que ven tus
          invitados; lo demás queda para tu equipo.
        </p>
      </div>
      <PanelButton href={nuevo} variant="primary">
        Sumar el primer momento
      </PanelButton>
    </div>
  )
}

/** El cronograma en orden de hora: una línea de tiempo con los avisos de solapes y márgenes cortos. */
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
  const nombre = (vid: string) => proveedores.find((p) => p.id === vid)?.service
  return (
    <ol className="relative flex flex-col">
      {momentos.map((m, i) => (
        <li aria-label={`${m.startsAt} ${m.title}`} className="group relative grid grid-cols-[64px_40px_1fr] gap-x-3 min-[560px]:grid-cols-[84px_48px_1fr]" key={m.id}>
          <span className="pt-3.5 text-right font-display text-[22px] leading-none font-light text-ink [font-variant-numeric:lining-nums_tabular-nums] min-[560px]:text-[26px]">
            {m.startsAt}
          </span>
          <span className="relative flex justify-center">
            {i < momentos.length - 1 ? <span aria-hidden className="absolute top-12 bottom-0 w-px bg-line-panel" /> : null}
            {i > 0 ? <span aria-hidden className="absolute top-0 h-3 w-px bg-line-panel" /> : null}
            <span className={`relative mt-2.5 grid size-9 place-items-center rounded-full border bg-white ${m.enInvitacion ? 'border-gold/60' : 'border-line-panel'}`}>
              {m.enInvitacion && m.icono ? <Dibujo clave={m.icono} iconos={iconos} tam="size-6" /> : <span aria-hidden className={`size-2 rounded-full ${m.enInvitacion ? 'bg-gold' : 'bg-line-panel-strong'}`} />}
            </span>
          </span>
          <div className="flex min-w-0 items-start justify-between gap-3 border-b border-line-panel pt-3 pb-4 group-last:border-none">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[15px] text-ink">{m.title}</span>
              <span className="text-[12px] text-ink-mute">
                {[`${m.durationMin} min`, m.place, m.owner ? `a cargo de ${m.owner}` : null, m.cue ? `♪ ${m.cue}` : null, ...m.vendorIds.map(nombre)].filter(Boolean).join(' · ')}
              </span>
              <span className="mt-1 flex flex-wrap gap-1.5">
                {m.enInvitacion ? (
                  <span className="inline-flex items-center gap-1 text-[11.5px] text-gold-deep">
                    <EyeIcon className="size-3.5" />
                    En la invitación
                  </span>
                ) : (
                  <span className="text-[11.5px] text-ink-mute">Solo para tu equipo</span>
                )}
                {m.aviso ? <Pill tone="no">{m.aviso}</Pill> : null}
              </span>
            </div>
            <Link
              aria-label={`Editar ${m.title}`}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-line-panel bg-white text-ink-soft transition hover:border-ink hover:text-ink"
              href={`${editarEn}${m.id}`}
              scroll={false}
            >
              <PenIcon className="size-4" />
            </Link>
          </div>
        </li>
      ))}
    </ol>
  )
}

/**
 * Lo que ven los invitados: el itinerario tal como lo lee la invitación. Sin momentos marcados,
 * la invitación enseña el ejemplo del diseño, y se dice.
 */
export function ItinerarioEnLaInvitacion({
  filas,
  ejemplo,
  iconos,
  vistaPrevia,
}: {
  filas: readonly FilaDeInvitacion[]
  ejemplo: readonly FilaDeInvitacion[]
  iconos: readonly IconoDeMomento[]
  vistaPrevia: string
}) {
  const deEjemplo = filas.length === 0
  const lista = deEjemplo ? ejemplo : filas
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12.5px] leading-[1.6] text-ink-soft">
        {deEjemplo
          ? 'Todavía no marcaste momentos para la invitación: tus invitados ven el itinerario de ejemplo del diseño.'
          : 'El itinerario que ven tus invitados, en el orden de la noche.'}
      </p>
      {lista.length === 0 ? null : (
        <ol className={`flex flex-col divide-y divide-line-panel ${deEjemplo ? 'opacity-55' : ''}`}>
          {lista.map((f, i) => (
            <li className="flex items-center gap-3 py-2.5" key={`${f.time}-${f.label}-${i}`}>
              <span className="grid size-9 shrink-0 place-items-center">
                <Dibujo clave={f.icono} iconos={iconos} tam="size-8" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{f.label}</span>
              <span className="font-display text-[17px] text-ink [font-variant-numeric:lining-nums_tabular-nums]">{f.time}</span>
            </li>
          ))}
        </ol>
      )}
      <PanelButton href={vistaPrevia}>Ver en la invitación</PanelButton>
    </div>
  )
}
