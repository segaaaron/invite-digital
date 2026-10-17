'use client'

import { useActionState } from 'react'
import { guardarEstiloAction, type EstiloState } from '@/app/_acciones/events/estilo-actions'
import { PanelButton, FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import type { EstiloDelEvento } from '../domain/estilo'
import { useT } from '@/shared/i18n/idioma-navegador'
import { traducir } from '@/shared/i18n/en-ingles'

const INICIAL: EstiloState = { status: 'idle', message: '' }

type Opcion = { readonly clave: string; readonly nombre: string }

/**
 * Colores y letra (Gala o más): el acento del diseño y su caligrafía, elegidos viéndolos en la
 * invitación de al lado. Solo enseña lo que el diseño admite y los colores que se leen sobre su
 * fondo; el corte del plan está en la acción.
 */
export function EstiloDelEventoCard({
  eventId,
  eventSlug,
  estilo,
  acentoDelDiseno,
  acentos,
  caligrafias,
  titulares,
  disponible,
  mejorar,
}: {
  eventId: string
  eventSlug: string
  estilo: EstiloDelEvento
  /** El color de acento original del diseño, o nulo si el diseño no deja cambiarlo. */
  acentoDelDiseno: string | null
  acentos: readonly { nombre: string; hex: string }[]
  /** Con sus clases de fuente, para enseñar cada letra escrita en sí misma. */
  caligrafias: readonly (Opcion & { readonly clase: string; readonly familia: string })[]
  titulares: readonly (Opcion & { readonly clase: string; readonly familia: string })[]
  disponible: boolean
  mejorar: { label: string; href: string } | null
}) {
  const t = useT()
  const [guardado, guardar] = useActionState(sinCaerse(guardarEstiloAction), INICIAL)

  if (!disponible) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          {t('En Gala e Imperial eliges el color de los titulares y detalles de tu diseño y su letra caligráfica, viéndolo en tu invitación.', 'In Gala and Imperial you choose the color of your design’s headings and details and its calligraphy, seeing it on your invitation.')}
        </p>
        {mejorar === null ? (
          <p className="text-[12px] text-ink-mute">{t('Escríbenos si quieres pasar a Gala.', 'Message us if you want to move to Gala.')}</p>
        ) : (
          <PanelButton href={mejorar.href}>{mejorar.label}</PanelButton>
        )}
      </div>
    )
  }

  return (
    <form action={guardar} className="flex flex-col gap-5">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="eventSlug" type="hidden" value={eventSlug} />

      {acentoDelDiseno === null ? null : (
        <fieldset className="flex flex-col gap-2.5">
          <legend className={`${LABEL_CLASS} mb-2.5`}>{t('Color de acento', 'Accent color')}</legend>
          <p className="-mt-1 text-[12px] text-ink-mute">{t('Titulares, filetes y botones. Las ilustraciones y fotos no cambian.', 'Headings, rules and buttons. Illustrations and photos don’t change.')}</p>
          <div className="flex flex-wrap gap-2.5">
            <Muestra checked={estilo.acento === null} hex={acentoDelDiseno} nombre={t('El del diseño', 'The design’s')} valor="" />
            {acentos.map((c) => (
              <Muestra checked={estilo.acento === c.hex} hex={c.hex} key={c.hex} nombre={traducir(c.nombre, t)} valor={c.hex} />
            ))}
          </div>
        </fieldset>
      )}

      {caligrafias.length === 0 ? null : (
        <Letras actual={estilo.caligrafia} etiqueta={t('Letra caligráfica', 'Calligraphy')} name="caligrafia" opciones={caligrafias} />
      )}
      {titulares.length === 0 ? null : <Letras actual={estilo.titulares} etiqueta={t('Letra de los titulares', 'Heading lettering')} name="titulares" opciones={titulares} />}

      <ActionFeedback state={guardado} />
      <div>
        <SubmitButton>{t('Guardar colores y letra', 'Save colors and lettering')}</SubmitButton>
      </div>
    </form>
  )
}

function Muestra({ hex, nombre, valor, checked }: { hex: string; nombre: string; valor: string; checked: boolean }) {
  return (
    <label className="flex w-[64px] cursor-pointer flex-col items-center gap-1.5 text-center text-[12px] leading-tight text-ink-soft">
      <input
        aria-label={nombre}
        className="size-9 cursor-pointer appearance-none rounded-full border border-line-panel-strong outline-offset-2 checked:outline-2 checked:outline-ink"
        defaultChecked={checked}
        name="acento"
        style={{ background: hex }}
        type="radio"
        value={valor}
      />
      <span aria-hidden>{nombre}</span>
    </label>
  )
}

function Letras({
  etiqueta,
  name,
  actual,
  opciones,
}: {
  etiqueta: string
  name: string
  actual: string | null
  opciones: readonly (Opcion & { readonly clase: string; readonly familia: string })[]
}) {
  const t = useT()
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className={`${LABEL_CLASS} mb-2.5`}>{etiqueta}</legend>
      {/* Por ancho, no por número de columnas: en la tarjeta de media pantalla cuatro columnas cortaban «Ori…» (16 oct). */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
        <Letra checked={actual === null} familia={null} name={name} nombre={t('Original', 'Original')} valor="" />
        {opciones.map((o) => (
          <Letra checked={actual === o.clave} clase={o.clase} familia={o.familia} key={o.clave} name={name} nombre={o.nombre} valor={o.clave} />
        ))}
      </div>
    </fieldset>
  )
}

function Letra({ name, valor, nombre, familia, clase, checked }: { name: string; valor: string; nombre: string; familia: string | null; clase?: string; checked: boolean }) {
  return (
    <label className={`${FIELD_CLASS} flex h-auto min-h-12 cursor-pointer items-center gap-2 py-2 has-[:checked]:border-ink ${clase ?? ''}`}>
      <input className="accent-ink" defaultChecked={checked} name={name} type="radio" value={valor} />
      <span className="text-[17px] leading-tight break-words" style={familia === null ? undefined : { fontFamily: familia }}>
        {nombre}
      </span>
    </label>
  )
}
