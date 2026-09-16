'use client'

import { useActionState, useId, useState } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { type ContentActionState, saveContentBlockAction } from '@/app/_acciones/events/actions'
import type { InvitationContent, SectionKey } from '../domain/invitation-content'
import { type EstadoBloque, aValor, estadoInicial, filaVacia } from './content-form'
import { type Campo, type FormaBloque, type LoQuePinta, formaPara } from './content-shapes'
import { type MediaItem, esPista } from './EventMediaPanel'
import { CheckIcon } from '@/shared/design/ui/icons'
import { CampoFechaHora } from './CampoFechaHora'
import { SubidaEnElCampo } from './SubidaEnElCampo'
import { SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: ContentActionState = { status: 'idle' }

/** Cómo se llama cada bloque en la pantalla, y qué se le pide. */
const TITULOS: Record<SectionKey, string> = {
  hero: 'Portada y nombres',
  quote: 'Frase',
  hosts: 'Padres y padrinos',
  schedule: 'Fecha y hora exactas',
  ceremony: 'Ceremonia',
  reception: 'Recepción',
  map: 'Mapa',
  itinerary: 'Itinerario',
  dressCode: 'Código de vestimenta',
  music: 'Canción',
  gallery: 'Galería',
  notes: 'Avisos',
  closing: 'Despedida',
}

const ERRORES: Record<string, string> = {
  unknown_section: 'Esa sección no existe en este diseño.',
  invalid_payload: 'No se pudo leer lo que enviaste. Vuelve a intentarlo.',
  storage_failure: 'No se pudo guardar. La base no respondió.',
}

type Props = {
  readonly eventId: string
  readonly eventSlug: string
  /** Las secciones que **este** diseño pinta. Las demás no se enseñan. */
  readonly sections: readonly SectionKey[]
  /** Lo que **este** diseño pinta de cada bloque. Lo que no pinte, no se pide. */
  readonly pinta: LoQuePinta
  readonly content: InvitationContent
  /** Las fotografías ya subidas del evento: lo que se ofrece en los campos de imagen. */
  readonly media: readonly MediaItem[]
  /**
   * El contenido de muestra del diseño. **No se guarda**: se enseña como ejemplo dentro de
   * cada campo y detrás del botón «Usar el texto de ejemplo».
   */
  readonly ejemplo: InvitationContent
}

/**
 * El contenido de la invitación, un formulario por bloque y un campo por dato.
 *
 * **Solo se enseñan las secciones que el diseño elegido pinta.** Pedirle un itinerario a
 * un diseño que no lo tiene es pedir trabajo que no se ve, y llenar la pantalla de
 * formularios que no sirven es la forma más rápida de que el atelier deje de rellenarla.
 *
 * Cada bloque se guarda por separado porque es la unidad de sentido: cambiar la canción no
 * puede exigir volver a enviar el itinerario.
 *
 * El valor sigue viajando como JSON en un campo oculto —el itinerario y la galería son
 * listas de longitud variable, y componerlas desde campos planos con índices en el nombre
 * es exactamente donde se pierden filas al reordenar—, pero **el JSON ya no lo escribe
 * nadie a mano**: lo compone `aValor` a partir de lo que hay en pantalla. Quien decide qué
 * es válido sigue siendo el dominio, en el servidor.
 */
export function ContentBlockForms({ eventId, eventSlug, sections, pinta, content, media, ejemplo }: Props) {
  if (sections.length === 0) {
    return (
      <p className="text-[13px] leading-[1.7] text-ink-soft">
        El diseño elegido no lleva contenido editable: se compone con el título, la fecha y el lugar del evento.
      </p>
    )
  }

  // Qué bloques ya tienen algo escrito: el índice lo dice de un vistazo, que es lo que
  // convierte una columna de doce formularios iguales en una lista de tareas.
  const escrito = (seccion: SectionKey): boolean => {
    const bloque = content[seccion]
    if (bloque === undefined || bloque === null) return false
    if (Array.isArray(bloque)) return bloque.length > 0
    return Object.values(bloque as Record<string, unknown>).some((v) => typeof v === 'string' && v.trim() !== '')
  }
  const hechos = sections.filter(escrito).length

  return (
    <div className="grid items-start gap-6 min-[1100px]:grid-cols-[210px_minmax(0,1fr)]">
      {/* El índice: dónde se está, qué falta y cuánto queda. Antes era una columna de bloques
          iguales sin principio ni final. */}
      <nav aria-label="Bloques de la invitación" className="hidden min-[1100px]:block min-[1100px]:sticky min-[1100px]:top-6">
        <p className="mb-2 font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">
          {hechos} de {sections.length} listos
        </p>
        <ul className="flex flex-col gap-0.5">
          {sections.map((seccion) => (
            <li key={seccion}>
              <a
                className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[13px] text-ink-soft transition-colors hover:bg-bg-top hover:text-ink"
                href={`#bloque-${seccion}`}
              >
                <span
                  aria-hidden
                  className={`grid size-4 shrink-0 place-items-center rounded-full ${
                    escrito(seccion) ? 'bg-sage text-white' : 'border border-line-panel-strong'
                  }`}
                >
                  {escrito(seccion) ? <CheckIcon className="size-2.5" /> : null}
                </span>
                {TITULOS[seccion]}
                <span className="sr-only">{escrito(seccion) ? ' · escrito' : ' · vacío'}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-5">
      {sections.map((seccion) => (
        <BloqueDeContenido
          content={content}
          ejemplo={ejemplo}
          eventId={eventId}
          eventSlug={eventSlug}
          pinta={pinta}
          key={seccion}
          media={media}
          section={seccion}
        />
      ))}
      </div>
    </div>
  )
}

function BloqueDeContenido({
  eventId,
  eventSlug,
  section,
  pinta,
  content,
  media,
  ejemplo,
}: {
  eventId: string
  eventSlug: string
  section: SectionKey
  pinta: LoQuePinta
  content: InvitationContent
  media: readonly MediaItem[]
  ejemplo: InvitationContent
}) {
  const forma = formaPara(section, pinta)
  const [state, formAction, isPending] = useActionState(saveContentBlockAction, INICIAL)
  const [estado, setEstado] = useState<EstadoBloque>(() => estadoInicial(forma, content[section]))

  // Si lo guardado cambia en el servidor por otro camino —subir la canción escribe su
  // archivo, título y artista—, el formulario se pone al día. Sin esto seguía con el archivo
  // ya borrado y el nombre de muestra, y guardarlo dejaba la invitación muda anunciando otra
  // canción. Se ajusta durante el render y **no** remontando con una `key`: remontar borraba
  // también el «Guardado» de la propia acción.
  const firma = JSON.stringify(content[section] ?? null)
  const [firmaVista, setFirmaVista] = useState(firma)
  if (firmaVista !== firma) {
    setFirmaVista(firma)
    setEstado(estadoInicial(forma, content[section]))
  }

  const error = state.status === 'error' ? (ERRORES[state.message] ?? ERRORES.storage_failure) : null

  // Lo que el diseño trae escrito en este bloque: es el ejemplo de cada campo.
  const muestra: Record<string, string> = (() => {
    const bloque = ejemplo[section]
    if (bloque === undefined || bloque === null || Array.isArray(bloque)) return {}
    return Object.fromEntries(Object.entries(bloque as Record<string, unknown>).map(([k, v]) => [k, typeof v === 'string' ? v : '']))
  })()

  const escribirCampo = (clave: string, valor: string) =>
    setEstado((previo) => ({ ...previo, campos: { ...previo.campos, [clave]: valor } }))

  return (
    <form action={formAction} className="flex scroll-mt-6 flex-col gap-3.5 border-t border-[var(--color-line-panel)] pt-4" id={`bloque-${section}`}>
      <input name="eventId" readOnly type="hidden" value={eventId} />
      <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
      <input name="section" readOnly type="hidden" value={section} />
      {/* Lo que se guarda. Se compone de lo que hay arriba; nadie lo teclea. */}
      <input name="value" readOnly type="hidden" value={JSON.stringify(aValor(forma, estado))} />

      <h3 className="font-display text-[17px] text-ink">{TITULOS[section]}</h3>

      {forma.form === 'campos' ? (
        <>
          <div className="grid gap-3 min-[560px]:grid-cols-2">
            {forma.fields.map((campo) => (
              <CampoDeBloque
                campo={campo}
                ejemplo={muestra[campo.key]}
                eventId={eventId}
                eventSlug={eventSlug}
                key={campo.key}
                media={media}
                onChange={(valor) => escribirCampo(campo.key, valor)}
                valor={estado.campos[campo.key] ?? ''}
              />
            ))}
          </div>
          {forma.list === undefined ? null : (
            <ListaSueltaDeBloque
              lista={forma.list}
              media={media}
              onChange={(valores) => setEstado((previo) => ({ ...previo, lista: valores }))}
              valores={estado.lista}
            />
          )}
        </>
      ) : (
        <FilasDeBloque
          forma={forma}
          media={media}
          onChange={(filas) => setEstado((previo) => ({ ...previo, filas }))}
          filas={estado.filas}
        />
      )}

      {error === null ? null : (
        <p className="text-[12px] text-gold-deep" role="alert">
          {error}
        </p>
      )}
      {state.status === 'success' ? (
        <p aria-live="polite" className="text-[12px] text-ink-soft" role="status">
          Guardado.
        </p>
      ) : null}

      <div>
        <SubmitButton variant="default" pending={isPending} pendingLabel={'Guardando…'}>{'Guardar'}</SubmitButton>
      </div>
    </form>
  )
}

/**
 * Un dato del bloque.
 *
 * El rótulo va **fuera** del control, como en el resto del panel: un `<label>` que
 * envuelve a su `<select>` mete el texto de todas las opciones en el nombre accesible del
 * campo, y ni un lector de pantalla ni una prueba lo encuentran por su nombre.
 */
function CampoDeBloque({
  campo,
  valor,
  onChange,
  media,
  etiqueta,
  ejemplo,
  eventId,
  eventSlug,
}: {
  campo: Campo
  valor: string
  onChange: (valor: string) => void
  media: readonly MediaItem[]
  /** El rótulo, cuando la fila necesita decir de qué fila se trata. */
  etiqueta?: string
  /** Lo que el diseño escribe aquí, como ejemplo dentro del campo. */
  ejemplo?: string | undefined
  eventId?: string
  eventSlug?: string
}) {
  const id = useId()
  const pistaId = `${id}-pista`
  const rotulo = etiqueta ?? campo.label

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${campo.kind === 'parrafo' ? 'min-[560px]:col-span-2' : ''}`}>
      <label className={LABEL_CLASS} htmlFor={id}>
        {rotulo}
      </label>

      {campo.kind === 'imagen' ? (
        <SelectorDeImagen
          eventId={eventId}
          eventSlug={eventSlug}
          id={id}
          media={media}
          onChange={onChange}
          valor={valor}
        />
      ) : campo.kind === 'audio' ? (
        <SelectorDeAudio eventId={eventId} eventSlug={eventSlug} id={id} media={media} onChange={onChange} valor={valor} />
      ) : campo.kind === 'fecha' ? (
        <CampoFechaHora id={id} onChange={onChange} valor={valor} />
      ) : campo.kind === 'parrafo' ? (
        <textarea
          aria-describedby={campo.hint === undefined ? undefined : pistaId}
          className={`${FIELD_CLASS} leading-[1.6]`}
          id={id}
          onChange={(evento) => onChange(evento.target.value)}
          placeholder={ejemplo}
          rows={3}
          value={valor}
        />
      ) : (
        <input
          aria-describedby={campo.hint === undefined ? undefined : pistaId}
          className={FIELD_CLASS}
          id={id}
          onChange={(evento) => onChange(evento.target.value)}
          placeholder={ejemplo}
          type="text"
          value={valor}
        />
      )}

      {campo.hint === undefined ? null : (
        <p className="text-[11px] leading-[1.5] text-ink-mute" id={pistaId}>
          {campo.hint}
        </p>
      )}
    </div>
  )
}

/**
 * Elegir una fotografía ya subida, en vez de copiar su identificador de una tarjeta y
 * pegarlo en otra.
 *
 * Si lo guardado no está entre las fotografías del evento —una imagen borrada, o el
 * contenido de muestra— se ofrece igual como opción propia: descartarlo en silencio
 * cambiaría la invitación por el mero hecho de abrir el formulario.
 */
function SelectorDeImagen({
  id,
  valor,
  onChange,
  media,
  eventId,
  eventSlug,
}: {
  id: string
  valor: string
  onChange: (valor: string) => void
  media: readonly MediaItem[]
  eventId?: string | undefined
  eventSlug?: string | undefined
}) {
  const conocida = media.some((imagen) => imagen.id === valor)

  return (
    <div className="flex flex-wrap items-start gap-2.5">
      {valor === '' ? null : (
        /* La sirve /media/[id], que no pasa por el optimizador: lleva la puerta de
           contraseña del evento. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="size-12 shrink-0 rounded-[10px] border border-[var(--color-line-panel)] object-cover"
          loading="lazy"
          src={`/media/${valor}`}
        />
      )}
      <select
        className={FIELD_CLASS}
        id={id}
        onChange={(evento) => onChange(evento.target.value)}
        value={valor}
      >
        <option value="">Sin fotografía</option>
        {media.map((imagen) => (
          <option key={imagen.id} value={imagen.id}>
            {imagen.originalName}
          </option>
        ))}
        {valor === '' || conocida ? null : <option value={valor}>{valor}</option>}
      </select>
      {eventId === undefined || eventSlug === undefined ? null : (
        <SubidaEnElCampo eventId={eventId} eventSlug={eventSlug} onSubido={onChange} tipo="imagen" />
      )}
    </div>
  )
}

/**
 * Elegir la música de la invitación entre los MP3 que ya se subieron.
 *
 * Ofrece **solo audio**: fotografías y música viven en la misma tabla, y sin filtrar aquí
 * el atelier acabaría eligiendo un retrato como canción.
 *
 * Y la deja escuchar con los controles del navegador. Es la única forma de saber que el
 * archivo elegido es el bueno antes de repartir la invitación: por el nombre no se
 * distingue una toma de otra, y el reproductor del diseño no se ve desde aquí.
 */
function SelectorDeAudio({
  id,
  valor,
  onChange,
  media,
  eventId,
  eventSlug,
}: {
  id: string
  valor: string
  onChange: (valor: string) => void
  media: readonly MediaItem[]
  eventId?: string | undefined
  eventSlug?: string | undefined
}) {
  const pistas = media.filter(esPista)
  const conocida = pistas.some((pista) => pista.id === valor)

  return (
    <div className="flex flex-col gap-2">
      <select className={FIELD_CLASS} id={id} onChange={(evento) => onChange(evento.target.value)} value={valor}>
        <option value="">Sin música</option>
        {pistas.map((pista) => (
          <option key={pista.id} value={pista.id}>
            {pista.originalName}
          </option>
        ))}
        {valor === '' || conocida ? null : <option value={valor}>{valor}</option>}
      </select>
      {/* Sin canciones subidas, el desplegable solo decía «Sin música»: aquí se sube. */}
      {eventId === undefined || eventSlug === undefined ? null : (
        <div>
          <SubidaEnElCampo eventId={eventId} eventSlug={eventSlug} onSubido={onChange} tipo="audio" />
        </div>
      )}

      {valor === '' ? null : (
        // La sirve /media/[id], con la puerta de contraseña del evento y con soporte de
        // rangos: sin él, esto no sonaría en iPhone. Sin subtítulos a propósito: es música
        // instrumental de fondo, no habla.
        <audio className="w-full" controls preload="none" src={`/media/${valor}`} />
      )}

      {pistas.length === 0 ? (
        <p className="text-[11px] leading-[1.5] text-ink-mute">
          Todavía no subiste ninguna. Sube un MP3 en «Fotografías y música» y vuelve aquí.
        </p>
      ) : null}
    </div>
  )
}

/** Los nombres de los anfitriones, las telas del código de vestimenta: una lista de valores sueltos. */
function ListaSueltaDeBloque({
  lista,
  valores,
  onChange,
  media,
}: {
  lista: NonNullable<Extract<FormaBloque, { form: 'campos' }>['list']>
  valores: readonly string[]
  onChange: (valores: readonly string[]) => void
  media: readonly MediaItem[]
}) {
  const campo: Campo = { key: lista.key, label: lista.itemLabel, kind: lista.kind === 'imagen' ? 'imagen' : 'texto' }

  return (
    <div className="flex flex-col gap-2.5">
      <p className={LABEL_CLASS}>{lista.label}</p>

      {valores.length === 0 ? (
        <p className="text-[12px] text-ink-soft">Todavía no hay ninguno.</p>
      ) : (
        valores.map((valor, indice) => (
          <div className="flex items-end gap-2" key={indice}>
            <div className="min-w-0 grow">
              <CampoDeBloque
                campo={campo}
                etiqueta={`${lista.itemLabel} ${indice + 1}`}
                media={media}
                onChange={(nuevo) => onChange(valores.map((v, i) => (i === indice ? nuevo : v)))}
                valor={valor}
              />
            </div>
            <PanelButton onClick={() => onChange(valores.filter((_, i) => i !== indice))}>Quitar</PanelButton>
          </div>
        ))
      )}

      <div>
        <PanelButton disabled={valores.length >= lista.max} onClick={() => onChange([...valores, ''])}>
          {`Añadir ${lista.itemLabel}`}
        </PanelButton>
      </div>
    </div>
  )
}

/**
 * El itinerario, la galería y los avisos: una lista de filas con sus propios campos.
 *
 * El orden importa —el itinerario se lee de arriba abajo— y por eso hay que poder moverlas
 * sin borrarlas y volver a escribirlas.
 */
function FilasDeBloque({
  forma,
  filas,
  onChange,
  media,
}: {
  forma: Extract<FormaBloque, { form: 'filas' }>
  filas: readonly Readonly<Record<string, string>>[]
  onChange: (filas: readonly Readonly<Record<string, string>>[]) => void
  media: readonly MediaItem[]
}) {
  const mover = (desde: number, hasta: number) => {
    if (hasta < 0 || hasta >= filas.length) return
    const copia = [...filas]
    const [movida] = copia.splice(desde, 1)
    if (movida === undefined) return
    copia.splice(hasta, 0, movida)
    onChange(copia)
  }

  return (
    <div className="flex flex-col gap-3">
      {filas.length === 0 ? (
        <p className="text-[12px] text-ink-soft">Todavía no hay ninguna. El diseño deja su sitio sin pintar.</p>
      ) : (
        filas.map((fila, indice) => (
          <div
            className="flex flex-col gap-3 rounded-[12px] border border-[var(--color-line-panel)] bg-bg-top p-3"
            key={indice}
          >
            <div className="grid gap-3 min-[560px]:grid-cols-2">
              {forma.fields.map((campo) => (
                <CampoDeBloque
                  campo={campo}
                  etiqueta={`${campo.label} · ${forma.itemLabel} ${indice + 1}`}
                  key={campo.key}
                  media={media}
                  onChange={(valor) =>
                    onChange(filas.map((f, i) => (i === indice ? { ...f, [campo.key]: valor } : f)))
                  }
                  valor={fila[campo.key] ?? ''}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <PanelButton disabled={indice === 0} onClick={() => mover(indice, indice - 1)}>
                {`Subir ${forma.itemLabel} ${indice + 1}`}
              </PanelButton>
              <PanelButton disabled={indice === filas.length - 1} onClick={() => mover(indice, indice + 1)}>
                {`Bajar ${forma.itemLabel} ${indice + 1}`}
              </PanelButton>
              <PanelButton onClick={() => onChange(filas.filter((_, i) => i !== indice))} variant="danger">
                {`Quitar ${forma.itemLabel} ${indice + 1}`}
              </PanelButton>
            </div>
          </div>
        ))
      )}

      <div>
        <PanelButton
          disabled={filas.length >= forma.max}
          onClick={() => onChange([...filas, filaVacia(forma.fields)])}
        >
          {`Añadir ${forma.itemLabel}`}
        </PanelButton>
      </div>
    </div>
  )
}
