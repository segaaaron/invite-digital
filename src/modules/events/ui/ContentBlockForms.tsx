'use client'

import { useActionState, useId, useState, useTransition } from 'react'
import { FIELD_CLASS, IconButton, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { type ContentActionState, removeMediaAction, saveContentBlockAction } from '@/app/_acciones/events/actions'
import type { InvitationContent, SectionKey } from '../domain/invitation-content'
import { type EstadoBloque, aValor, estadoInicial, filaVacia } from './content-form'
import { type Anfitriones, type Campo, type FormaBloque, type LoQuePinta, formaPara } from './content-shapes'
import { type MediaItem, esPista } from './media-item'
import {
  BuildingIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  GlobeIcon,
  HangerIcon,
  HeartIcon,
  HelpIcon,
  LayoutIcon,
  MusicIcon,
  PersonIcon,
  PinIcon,
  QuoteIcon,
  TrashIcon,
  UsersIcon,
} from '@/shared/design/ui/icons'
import type { ComponentType } from 'react'
import { CampoFechaHora } from './CampoFechaHora'
import { type AvisoDeSeccion, EVENTO_SECCION, textosDeSeccion } from './seguir-seccion'
import { SubidaEnElCampo } from './SubidaEnElCampo'
import { SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: ContentActionState = { status: 'idle' }

type Icono = ComponentType<{ className?: string }>

/**
 * Cómo se llama cada bloque en la pantalla, qué es en la invitación y su icono.
 *
 * La descripción dice **dónde sale**, no cómo se guarda: quien rellena esto es la
 * quinceañera o los novios, y «rótulo» o «línea suelta» no le dicen nada.
 */
const BLOQUES: Record<SectionKey, { titulo: string; descripcion: string; Icono: Icono }> = {
  hero: { titulo: 'Portada y nombres', descripcion: 'Lo primero que se ve al abrir la invitación.', Icono: LayoutIcon },
  quote: { titulo: 'Frase', descripcion: 'Unas palabras que abren la invitación.', Icono: QuoteIcon },
  hosts: {
    titulo: 'Padres y padrinos',
    descripcion: 'Tus padres y tus padrinos, cada uno con su nombre.',
    Icono: UsersIcon,
  },
  schedule: { titulo: 'Fecha y hora', descripcion: 'El día y la hora de la fiesta. La cuenta atrás cuenta hasta aquí.', Icono: CalendarIcon },
  ceremony: { titulo: 'Ceremonia', descripcion: 'Dónde y a qué hora es la ceremonia.', Icono: PinIcon },
  reception: { titulo: 'Recepción', descripcion: 'Dónde es la fiesta y a qué hora empieza.', Icono: PinIcon },
  map: { titulo: 'Mapa', descripcion: 'El nombre del lugar sobre el mapa y cómo llegar.', Icono: GlobeIcon },
  itinerary: { titulo: 'Itinerario', descripcion: 'Los momentos de la noche, en orden.', Icono: ClockIcon },
  dressCode: { titulo: 'Código de vestimenta', descripcion: 'Cómo pides que vengan vestidos.', Icono: HangerIcon },
  music: { titulo: 'Canción', descripcion: 'La música que suena al abrir la invitación.', Icono: MusicIcon },
  gallery: { titulo: 'Galería', descripcion: 'Las fotografías que enseña la invitación.', Icono: CameraIcon },
  notes: { titulo: 'Avisos', descripcion: 'Lo que tus invitados tienen que saber: regalos, niños, parqueo.', Icono: HelpIcon },
  closing: { titulo: 'Despedida', descripcion: 'Las últimas palabras, al final de la invitación.', Icono: HeartIcon },
}

/** El icono que acompaña a un campo, cuando ayuda a saber qué se escribe ahí. */
const ICONO_DE_CAMPO: Record<string, Icono> = {
  nameA: PersonIcon,
  nameB: PersonIcon,
  names: PersonIcon,
  place: PinIcon,
  address: BuildingIcon,
  time: ClockIcon,
  coords: GlobeIcon,
  href: GlobeIcon,
  track: MusicIcon,
  artist: PersonIcon,
  signature: PersonIcon,
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
  /** Qué anfitriones pide la fiesta: padre y madre en un XV, los padres de cada novio en una boda. */
  readonly anfitriones?: Anfitriones
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
export function ContentBlockForms({ eventId, eventSlug, sections, pinta, content, media, ejemplo, anfitriones = 'boda' }: Props) {
  if (sections.length === 0) {
    return (
      <p className="text-[13px] leading-[1.7] text-ink-soft">
        El diseño elegido no lleva contenido editable: se compone con el título, la fecha y el lugar del evento.
      </p>
    )
  }

  const hechos = sections.filter((seccion) => escrito(content, seccion)).length

  return (
    <Acordeon
      anfitriones={anfitriones}
      content={content}
      ejemplo={ejemplo}
      eventId={eventId}
      eventSlug={eventSlug}
      hechos={hechos}
      media={media}
      pinta={pinta}
      sections={sections}
    />
  )
}

/** Si el bloque tiene algo escrito. */
const escrito = (content: InvitationContent, seccion: SectionKey): boolean => {
  const bloque = content[seccion]
  if (bloque === undefined || bloque === null) return false
  if (Array.isArray(bloque)) return bloque.length > 0
  return Object.values(bloque as Record<string, unknown>).some(
    (v) => (typeof v === 'string' && v.trim() !== '') || (Array.isArray(v) && v.length > 0),
  )
}

const FECHA_CORTA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const fechaLegible = (valor: string): string => {
  const [dia = '', hora = ''] = valor.split('T')
  const fecha = new Date(`${dia}T00:00:00Z`)
  return Number.isNaN(fecha.getTime()) ? valor : `${FECHA_CORTA.format(fecha)}${hora === '' ? '' : `, ${hora.slice(0, 5)} h`}`
}

/** Lo que el bloque ya dice, en una línea y en el orden del formulario: «MIS QUINCE · Loreley». */
const resumen = (content: InvitationContent, seccion: SectionKey, forma: FormaBloque): string => {
  const bloque = content[seccion]
  if (bloque === undefined || bloque === null) return ''
  if (Array.isArray(bloque)) return `${bloque.length} ${bloque.length === 1 ? 'elemento' : 'elementos'}`
  const datos = bloque as Record<string, unknown>
  // Los archivos no se resumen: su identificador no le dice nada a quien lo lee.
  const textos = forma.fields
    .filter((campo) => campo.kind !== 'imagen' && campo.kind !== 'audio')
    .map((campo) => {
      const v = datos[campo.key]
      if (typeof v !== 'string' || v.trim() === '') return null
      // Los adornos que algunos escriben alrededor —«· MIS QUINCE ·»— no hacen falta aquí.
      return campo.kind === 'fecha' ? fechaLegible(v) : v.replace(/^[\s·•|-]+|[\s·•|-]+$/g, '')
    })
    .filter((v): v is string => v !== null)
  // Los padrinos viven dentro de `roles`; los nombres de todos, compuestos, en `names`.
  const lista = forma.form === 'campos' && forma.anfitriones !== undefined ? [] : forma.form === 'campos' && forma.list !== undefined ? datos[forma.list.key] : undefined
  const nombres = Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : []
  return [...textos, ...nombres].slice(0, 3).join(' · ')
}

/**
 * Las secciones como tarjetas que se abren de una en una.
 *
 * Doce formularios abiertos uno debajo de otro, con un índice de puntos al lado, no decían
 * por dónde empezar ni qué faltaba. Aquí cada tarjeta plegada dice qué tiene escrito y si
 * está lista, en palabras; se abre sola la primera que falta, y abrir otra pliega la que
 * había. Lo escrito en una tarjeta plegada no se pierde: sigue montada, oculta.
 */
function Acordeon({ sections, content, hechos, ...resto }: Props & { hechos: number }) {
  const [abierta, setAbierta] = useState<SectionKey | null>(
    () => sections.find((seccion) => !escrito(content, seccion)) ?? sections[0] ?? null,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-ink">{`${hechos} de ${sections.length} secciones listas`}</p>
        <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-bg-top">
          <div className="h-full rounded-full bg-sage transition-[width]" style={{ width: `${(hechos / Math.max(1, sections.length)) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sections.map((seccion) => (
          <BloqueDeContenido
            {...resto}
            abierta={abierta === seccion}
            content={content}
            key={seccion}
            onAlternar={() => {
              const abre = abierta !== seccion
              setAbierta(abre ? seccion : null)
              // La vista previa va a esa parte de la invitación: se ve dónde cae lo que se edita.
              if (abre) {
                const aviso: AvisoDeSeccion = { seccion, textos: textosDeSeccion(content, seccion) }
                window.dispatchEvent(new CustomEvent(EVENTO_SECCION, { detail: aviso }))
              }
            }}
            section={seccion}
          />
        ))}
      </div>
    </div>
  )
}

function IconoDeBloque({ seccion, className = 'size-4 shrink-0 text-ink-mute' }: { seccion: SectionKey; className?: string }) {
  const { Icono } = BLOQUES[seccion]
  return <Icono className={className} />
}

function IconoDeCampo({ clave }: { clave: string }) {
  const Icono = ICONO_DE_CAMPO[clave]
  return Icono === undefined ? null : (
    <Icono className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-mute" />
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
  abierta,
  onAlternar,
  anfitriones = 'boda',
}: {
  anfitriones?: Anfitriones | undefined
  abierta: boolean
  onAlternar: () => void
  eventId: string
  eventSlug: string
  section: SectionKey
  pinta: LoQuePinta
  content: InvitationContent
  media: readonly MediaItem[]
  ejemplo: InvitationContent
}) {
  const forma = formaPara(section, pinta, anfitriones)
  const cuerpoId = useId()
  const listo = escrito(content, section)
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
    <form
      action={formAction}
      className={`scroll-mt-6 rounded-[18px] border bg-white transition-shadow ${
        abierta ? 'border-line-panel-strong shadow-[0_12px_40px_-24px_rgb(0_0_0/0.35)]' : 'border-line-panel hover:border-line-panel-strong'
      }`}
      id={`bloque-${section}`}
    >
      <input name="eventId" readOnly type="hidden" value={eventId} />
      <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
      <input name="section" readOnly type="hidden" value={section} />
      {/* Lo que se guarda. Se compone de lo que hay arriba; nadie lo teclea. */}
      <input name="value" readOnly type="hidden" value={JSON.stringify(aValor(forma, estado))} />

      <h3 className="m-0">
        <button
          aria-controls={`${cuerpoId}-cuerpo`}
          aria-describedby={`${cuerpoId}-estado ${cuerpoId}-resumen`}
          aria-expanded={abierta}
          aria-labelledby={`${cuerpoId}-titulo`}
          className="flex w-full cursor-pointer items-center gap-3.5 p-4 text-left min-[560px]:gap-4 min-[560px]:p-5"
          onClick={onAlternar}
          type="button"
        >
          <span aria-hidden className={`grid size-11 shrink-0 place-items-center rounded-full ${listo ? 'bg-bg-top text-ink-soft' : 'bg-gold/15 text-gold-deep'}`}>
            <IconoDeBloque className="size-5" seccion={section} />
          </span>
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="font-display text-[19px] leading-tight text-ink min-[560px]:text-[21px]" id={`${cuerpoId}-titulo`}>
              {BLOQUES[section].titulo}
            </span>
            {/* El nombre del botón es solo el título; esto y el estado van en su descripción. */}
            <span className="truncate text-[12.5px] text-ink-soft" id={`${cuerpoId}-resumen`}>
              {listo && !abierta ? resumen(content, section, forma) || BLOQUES[section].descripcion : BLOQUES[section].descripcion}
            </span>
          </span>
          <span
            className={`shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium max-[419px]:sr-only min-[420px]:flex ${
              listo ? 'bg-sage text-white' : 'border border-gold/60 text-gold-deep'
            }`}
            id={`${cuerpoId}-estado`}
          >
            {listo ? <CheckIcon className="size-3" /> : null}
            {listo ? 'Listo' : 'Por completar'}
          </span>
          <ChevronIcon className={`size-4 shrink-0 text-ink-mute transition-transform ${abierta ? 'rotate-180' : ''}`} />
        </button>
      </h3>

      <div className="flex flex-col gap-4 border-t border-line-panel px-4 pt-4 pb-5 min-[560px]:px-5" hidden={!abierta} id={`${cuerpoId}-cuerpo`}>
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
          eventId={eventId}
          eventSlug={eventSlug}
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
      <div className="flex flex-wrap items-center gap-3 border-t border-line-panel pt-4">
        <SubmitButton variant="primary" pending={isPending} pendingLabel={'Guardando…'}>{'Guardar'}</SubmitButton>
        {state.status === 'success' ? (
          <p aria-live="polite" className="flex items-center gap-1.5 text-[12px] text-sage" role="status">
            <CheckIcon className="size-3.5" />
            Guardado. La vista previa ya lo enseña.
          </p>
        ) : null}
      </div>
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
    <div className={`flex min-w-0 flex-col gap-2 ${campo.kind === 'parrafo' || campo.kind === 'imagen' || campo.kind === 'fecha' || campo.anchoCompleto === true ? 'min-[560px]:col-span-2' : ''}`}>
      {campo.kind === 'imagen' ? (
        <p className={LABEL_CLASS} id={`${id}-rotulo`}>
          {rotulo}
        </p>
      ) : (
        <label className={LABEL_CLASS} htmlFor={id}>
          {rotulo}
        </label>
      )}

      {campo.kind === 'imagen' ? (
        <SelectorDeImagen
          eventId={eventId}
          eventSlug={eventSlug}
          rotuloId={`${id}-rotulo`}
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
          placeholder={ejemplo === undefined || ejemplo === '' ? undefined : `Ej.: ${ejemplo}`}
          rows={3}
          value={valor}
        />
      ) : (
        <div className="relative">
          {ICONO_DE_CAMPO[campo.key] === undefined ? null : (
            <IconoDeCampo clave={campo.key} />
          )}
          <input
            aria-describedby={campo.hint === undefined ? undefined : pistaId}
            className={`${FIELD_CLASS} ${ICONO_DE_CAMPO[campo.key] === undefined ? '' : 'pl-10'}`}
            id={id}
            onChange={(evento) => onChange(evento.target.value)}
            placeholder={ejemplo === undefined || ejemplo === '' ? undefined : `Ej.: ${ejemplo}`}
            type="text"
            value={valor}
          />
        </div>
      )}

      {campo.hint === undefined ? null : (
        <p className="text-[11px] leading-[1.5] text-ink-mute" id={pistaId}>
          {campo.hint}
        </p>
      )}
    </div>
  )
}

const ERRORES_AL_QUITAR: Record<string, string> = {
  in_use: 'Esa foto la usa otra parte de la invitación. Cámbiala allí primero.',
  not_found: 'Esa foto ya no está.',
}

const MINIATURA =
  'relative grid aspect-square w-full cursor-pointer place-items-center overflow-hidden rounded-[12px] border bg-bg-top transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

/**
 * Elegir la fotografía **mirándola**: una miniatura por foto subida, la elegida marcada, y
 * al final el botón de subir otra, que queda elegida al subirla.
 *
 * Era un desplegable con nombres de archivo —«IMG_4032.jpg»— junto a una tarjeta aparte de
 * «Fotografías y música» donde se subían: dos sitios para una sola cosa, y ninguno enseñaba
 * la foto. Las que no se usan en ninguna parte se pueden quitar desde aquí.
 *
 * Si lo guardado no está entre las fotos del evento —una imagen borrada, o la muestra— se
 * ofrece igual como «la fotografía guardada»: descartarla en silencio cambiaría la
 * invitación por el mero hecho de abrir el formulario.
 */
function SelectorDeImagen({
  rotuloId,
  valor,
  onChange,
  media,
  eventId,
  eventSlug,
}: {
  rotuloId: string
  valor: string
  onChange: (valor: string) => void
  media: readonly MediaItem[]
  eventId?: string | undefined
  eventSlug?: string | undefined
}) {
  const fotos = media.filter((item) => !esPista(item))
  const conocida = fotos.some((imagen) => imagen.id === valor)
  const [quitando, empezar] = useTransition()
  const [aviso, setAviso] = useState<string | null>(null)

  const quitar = (mediaId: string) => {
    if (eventId === undefined || eventSlug === undefined) return
    setAviso(null)
    empezar(async () => {
      const datos = new FormData()
      datos.set('eventId', eventId)
      datos.set('eventSlug', eventSlug)
      datos.set('mediaId', mediaId)
      const r = await removeMediaAction({ status: 'idle' }, datos)
      if (r.status === 'error') setAviso(ERRORES_AL_QUITAR[r.message] ?? 'No se pudo quitar la foto.')
    })
  }

  const marca = (elegida: boolean) => (elegida ? 'border-ink ring-2 ring-ink' : 'border-line-panel hover:border-line-panel-strong')

  return (
    <div aria-labelledby={rotuloId} className="flex flex-col gap-2.5" role="group">
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(76px,1fr))]">
        <button aria-pressed={valor === ''} className={`${MINIATURA} ${marca(valor === '')}`} onClick={() => onChange('')} type="button">
          <span className="px-1 text-center text-[11px] leading-tight text-ink-mute">Sin foto</span>
        </button>

        {valor === '' || conocida ? null : (
          <button aria-label="Usar la fotografía guardada" aria-pressed className={`${MINIATURA} ${marca(true)}`} onClick={() => onChange(valor)} type="button">
            {/* La sirve /media/[id], que no pasa por el optimizador: lleva la puerta de contraseña del evento. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="size-full object-cover" loading="lazy" src={`/media/${valor}`} />
          </button>
        )}

        {fotos.map((foto) => (
          <div className="group relative" key={foto.id}>
            <button
              aria-label={`Usar ${foto.originalName}`}
              aria-pressed={valor === foto.id}
              className={`${MINIATURA} ${marca(valor === foto.id)}`}
              onClick={() => onChange(foto.id)}
              title={foto.fromGuest ? `${foto.originalName} · la subió un invitado` : foto.originalName}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="size-full object-cover" loading="lazy" src={`/media/${foto.id}`} />
              {valor === foto.id ? (
                <span aria-hidden className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-ink text-white">
                  <CheckIcon className="size-3" />
                </span>
              ) : null}
            </button>
            {valor === foto.id || eventId === undefined ? null : (
              <button
                aria-label={`Quitar ${foto.originalName}`}
                className="absolute top-1 right-1 hidden size-6 cursor-pointer place-items-center rounded-full bg-white/95 text-ink-soft shadow group-hover:grid group-focus-within:grid hover:text-danger"
                disabled={quitando}
                onClick={() => quitar(foto.id)}
                type="button"
              >
                <TrashIcon className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {eventId === undefined || eventSlug === undefined ? null : (
        <div>
          <SubidaEnElCampo eventId={eventId} eventSlug={eventSlug} onSubido={onChange} tipo="imagen" />
        </div>
      )}
      {aviso === null ? null : (
        <p className="text-[12px] text-gold-deep" role="alert">
          {aviso}
        </p>
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
          Todavía no subiste ninguna. Súbela con el botón de aquí arriba: queda elegida al subirla.
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
        <p className="text-[12px] text-ink-soft">Ninguno todavía. Si no hay, déjalo así: la invitación no pinta este grupo.</p>
      ) : (
        valores.map((valor, indice) => (
          <div className="flex items-end gap-2" key={indice}>
            <div className="min-w-0 grow">
              <CampoDeBloque
                campo={campo}
                etiqueta={`${lista.itemLabel.charAt(0).toUpperCase()}${lista.itemLabel.slice(1)} ${indice + 1}`}
                media={media}
                onChange={(nuevo) => onChange(valores.map((v, i) => (i === indice ? nuevo : v)))}
                valor={valor}
              />
            </div>
            <IconButton
              className="mb-1.5 hover:border-danger hover:text-danger"
              label={`Quitar ${lista.itemLabel} ${indice + 1}`}
              onClick={() => onChange(valores.filter((_, i) => i !== indice))}
            >
              <TrashIcon className="size-4" />
            </IconButton>
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
  eventId,
  eventSlug,
}: {
  eventId: string
  eventSlug: string
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
            className="flex flex-col gap-3 rounded-[14px] border border-[var(--color-line-panel)] bg-bg-top/60 p-3.5"
            key={indice}
          >
            <div className="grid gap-3 min-[560px]:grid-cols-2">
              {forma.fields.map((campo) => (
                <CampoDeBloque
                  campo={campo}
                  eventId={eventId}
                  eventSlug={eventSlug}
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

            {/* Mover y quitar, discretos: son de cada fila y no deben pesar más que sus datos. */}
            <div className="flex justify-end gap-1.5">
              <IconButton disabled={indice === 0} label={`Subir ${forma.itemLabel} ${indice + 1}`} onClick={() => mover(indice, indice - 1)}>
                <ChevronIcon className="size-4 rotate-180" />
              </IconButton>
              <IconButton disabled={indice === filas.length - 1} label={`Bajar ${forma.itemLabel} ${indice + 1}`} onClick={() => mover(indice, indice + 1)}>
                <ChevronIcon className="size-4" />
              </IconButton>
              <IconButton
                className="hover:border-danger hover:text-danger"
                label={`Quitar ${forma.itemLabel} ${indice + 1}`}
                onClick={() => onChange(filas.filter((_, i) => i !== indice))}
              >
                <TrashIcon className="size-4" />
              </IconButton>
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
