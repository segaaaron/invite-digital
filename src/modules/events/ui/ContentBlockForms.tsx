'use client'

import { createContext, useActionState, useContext, useEffect, useId, useMemo, useRef, useState, useTransition } from 'react'
import { FIELD_CLASS, IconButton, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { type ContentActionState, removeMediaAction, saveContentBlockAction } from '@/app/_acciones/events/actions'
import type { InvitationContent, SectionKey } from '../domain/invitation-content'
import { type EstadoBloque, aValor, estadoInicial, filaVacia } from './content-form'
import type { Fiesta } from '../domain/fiesta'
import { type Campo, type FormaBloque, type LoQuePinta, formaPara } from './content-shapes'
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
  PlusIcon,
  QuoteIcon,
  TrashIcon,
  UsersIcon,
} from '@/shared/design/ui/icons'
import type { ComponentType } from 'react'
import { CampoFechaHora } from '@/shared/design/ui/panel/CampoFechaHora'
import { type AvisoDeSeccion, EVENTO_SECCION, textosDeSeccion } from './seguir-seccion'
import { GuardarLaSeccion, SubidaEnElCampo } from './SubidaEnElCampo'
import { enlaceDeUbicacion, mapaIncrustado } from '../domain/ubicacion'
import { COLORES_DE_VESTIMENTA } from '../domain/paleta-vestimenta'
import { iconosDelItinerario, type OpcionDeIcono } from './themes/iconos-itinerario'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { anexoDe, escrito, visibles } from './avance-de-invitacion'
import { useT } from '@/shared/i18n/idioma-navegador'
import { INTL, type T } from '@/shared/i18n/t'
import { traducir } from '@/shared/i18n/en-ingles'

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
  reception: { titulo: 'Recepción', descripcion: 'Dónde es la fiesta, a qué hora empieza y cómo llegar.', Icono: PinIcon },
  map: { titulo: 'Mapa', descripcion: 'El nombre del lugar sobre el mapa y cómo llegar.', Icono: GlobeIcon },
  itinerary: { titulo: 'Itinerario', descripcion: 'Los momentos de la noche, en orden.', Icono: ClockIcon },
  dressCode: { titulo: 'Código de vestimenta', descripcion: 'Cómo pides que vengan vestidos.', Icono: HangerIcon },
  music: { titulo: 'Canción', descripcion: 'La música que suena al abrir la invitación.', Icono: MusicIcon },
  gallery: { titulo: 'Galería', descripcion: 'Las fotografías que enseña la invitación.', Icono: CameraIcon },
  notes: { titulo: 'Avisos', descripcion: 'Lo que tus invitados tienen que saber: regalos, niños, parqueo.', Icono: HelpIcon },
  closing: { titulo: 'Despedida', descripcion: 'Las últimas palabras, al final de la invitación.', Icono: HeartIcon },
}

/**
 * Cómo se llama cada bloque cuando la fiesta no es una boda.
 *
 * Un cumpleaños no tiene «recepción»: puede ser un salón, un bar o la casa de quien cumple,
 * y hablarle de recepción hace pensar que se le pide otra cosa. Lo que no esté aquí se
 * llama igual en las tres fiestas.
 */
const BLOQUES_DE_FIESTA: Partial<Record<Fiesta, Partial<Record<SectionKey, { titulo: string; descripcion: string }>>>> = {
  cumple: {
    reception: { titulo: 'Dónde es la fiesta', descripcion: 'El sitio —un salón, un bar o tu casa—, a qué hora empieza y cómo llegar.' },
    ceremony: { titulo: 'Otro lugar', descripcion: 'Si la celebración empieza en otro sitio, dónde y a qué hora.' },
    hosts: { titulo: 'Quién invita', descripcion: 'Los nombres de quienes reciben, cada uno con el suyo.' },
    closing: { titulo: 'Despedida', descripcion: 'Las últimas palabras, al final de la invitación.' },
  },
}

/** El nombre y la descripción de un bloque en esta fiesta. */
const bloqueDe = (section: SectionKey, fiesta: Fiesta, t: T) => {
  const b = { ...BLOQUES[section], ...BLOQUES_DE_FIESTA[fiesta]?.[section] }
  return { ...b, titulo: traducir(b.titulo, t), descripcion: traducir(b.descripcion, t) }
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

/** Guardar una sección nunca tumba la pantalla: un fallo del servidor sale como aviso en la propia tarjeta. */
const GUARDAR_SIN_CAERSE = sinCaerse(saveContentBlockAction, { status: 'error', message: 'network' })

const errores = (t: T): Record<string, string> => ({
  network: t('No se pudo guardar: se cortó la conexión o el servidor no respondió. Vuelve a intentarlo; ya quedó anotado.', 'It couldn’t be saved: the connection dropped or the server didn’t respond. Try again; it has been logged.'),
  unknown_section: t('Esa sección no existe en este diseño.', 'That section doesn’t exist in this design.'),
  invalid_payload: t('No se pudo leer lo que enviaste. Vuelve a intentarlo.', 'What you sent couldn’t be read. Try again.'),
  storage_failure: t('No se pudo guardar. La base no respondió.', 'It couldn’t be saved. The database didn’t respond.'),
})

/**
 * El motivo de no guardar, **con el campo por su nombre** («Lugar», «Ubicación en Google Maps»): antes
 * lo que no cabía se recortaba en silencio. `campo` es la ruta (`href`, `rows.2.title`); de la última
 * parte sale el rótulo del formulario, y el número de fila si lo hay.
 */
type FormaConRotulos = { readonly fields: readonly { key: string; label: string }[]; readonly list?: { readonly key: string; readonly label: string } | undefined }

function errorDeGuardado(state: { message: string; campo?: string; maximo?: number }, t: T, forma: FormaConRotulos, formaAnexo?: FormaConRotulos): string {
  const ERRORES = errores(t)
  if (state.message !== 'texto_largo' && state.message !== 'valor_invalido') return ERRORES[state.message] ?? ERRORES.storage_failure!
  const partes = (state.campo ?? '').split('.')
  // Un nombre de una lista (`roles.godparents.1`): el rótulo es el de la lista.
  const clave = [...partes].reverse().find((p) => !/^\d+$/.test(p)) ?? ''
  const fila = partes.find((p) => /^\d+$/.test(p))
  const listas = [forma.list, formaAnexo?.list].flatMap((l) => (l === undefined ? [] : [l]))
  const encontrado = [...forma.fields, ...(formaAnexo?.fields ?? []), ...listas].find((f) => f.key === clave)?.label
  const rotulo = encontrado === undefined ? t('Un campo', 'A field') : traducir(encontrado, t)
  const donde = fila === undefined ? t(`«${rotulo}»`, `“${rotulo}”`) : t(`«${rotulo}» de la fila ${Number(fila) + 1}`, `“${rotulo}” in row ${Number(fila) + 1}`)
  return state.message === 'texto_largo'
    ? t(`${donde} es demasiado largo: acórtalo a ${state.maximo ?? ''} caracteres. No se guardó nada.`, `${donde} is too long: shorten it to ${state.maximo ?? ''} characters. Nothing was saved.`)
    : t(`${donde} no es válido${clave === 'href' ? ': pega el enlace de Google Maps o escribe la dirección' : ''}. No se guardó nada.`, `${donde} is not valid${clave === 'href' ? ': paste the Google Maps link or type the address' : ''}. Nothing was saved.`)
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
  /**
   * La fiesta del diseño. Decide qué anfitriones se piden —padre y madre en un XV, los
   * padres de cada novio en una boda— y cómo se llaman los bloques y sus ejemplos.
   */
  readonly fiesta?: Fiesta
  /** El diseño, para ofrecer los iconos de su itinerario dibujados como los pinta. */
  readonly temaKey?: string
  /**
   * Dónde se edita el itinerario cuando sale del cronograma del día. Con él, la sección no
   * pide los momentos otra vez: lleva al cronograma, que es la única lista.
   */
  readonly itinerarioDesde?: string
}

/** Los iconos del itinerario del diseño, sin pasarlos campo a campo por cada nivel. */
const IconosDelDiseno = createContext<readonly OpcionDeIcono[]>([])

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
export function ContentBlockForms({ eventId, eventSlug, sections, pinta, content, media, ejemplo, fiesta = 'boda', temaKey, itinerarioDesde }: Props) {
  const t = useT()
  const iconos = useMemo(() => (temaKey === undefined ? [] : iconosDelItinerario(temaKey)), [temaKey])
  if (sections.length === 0) {
    return (
      <p className="text-[13px] leading-[1.7] text-ink-soft">
        {t('El diseño elegido no lleva contenido editable: se compone con el título, la fecha y el lugar del evento.', 'The chosen design has no editable content: it is built from the event’s title, date and place.')}
      </p>
    )
  }

  const hechos = visibles(sections).filter((seccion) => escrito(content, seccion)).length

  return (
    <IconosDelDiseno.Provider value={iconos}>
    <Acordeon
      {...(itinerarioDesde === undefined ? {} : { itinerarioDesde })}
      fiesta={fiesta}
      content={content}
      ejemplo={ejemplo}
      eventId={eventId}
      eventSlug={eventSlug}
      hechos={hechos}
      media={media}
      pinta={pinta}
      sections={sections}
    />
    </IconosDelDiseno.Provider>
  )
}

/** Si el formulario ya lleva algo, aunque no esté guardado: «Por completar» en vez de «Sin empezar». */
const algoEscrito = (estado: EstadoBloque): boolean =>
  Object.values(estado.campos).some((v) => v.trim() !== '') || estado.lista.length > 0 || estado.filas.length > 0

/** En la fila plegada, lo que dice un número: «6 de 20 fotos». El resto, «Lista». */
const resumenCorto = (content: InvitationContent, seccion: SectionKey, t: T): string | null => {
  const bloque = content[seccion]
  return Array.isArray(bloque) && seccion === 'gallery' ? t(`${bloque.length} ${bloque.length === 1 ? 'foto' : 'fotos'}`, `${bloque.length} ${bloque.length === 1 ? 'photo' : 'photos'}`) : null
}

const FECHA_CORTA = { es: new Intl.DateTimeFormat(INTL.es, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }), en: new Intl.DateTimeFormat(INTL.en, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) }
const fechaLegible = (valor: string, t: T): string => {
  const [dia = '', hora = ''] = valor.split('T')
  const fecha = new Date(`${dia}T00:00:00Z`)
  return Number.isNaN(fecha.getTime()) ? valor : `${FECHA_CORTA[t('es', 'en') === 'es' ? 'es' : 'en'].format(fecha)}${hora === '' ? '' : `, ${hora.slice(0, 5)} h`}`
}

/** Lo que el bloque ya dice, en una línea y en el orden del formulario: «MIS QUINCE · Loreley». */
const resumen = (content: InvitationContent, seccion: SectionKey, forma: FormaBloque, t: T): string => {
  const bloque = content[seccion]
  if (bloque === undefined || bloque === null) return ''
  if (Array.isArray(bloque)) return t(`${bloque.length} ${bloque.length === 1 ? 'elemento' : 'elementos'}`, `${bloque.length} ${bloque.length === 1 ? 'item' : 'items'}`)
  const datos = bloque as Record<string, unknown>
  // Los archivos no se resumen: su identificador no le dice nada a quien lo lee.
  const textos = forma.fields
    .filter((campo) => campo.kind !== 'imagen' && campo.kind !== 'audio')
    .map((campo) => {
      const v = datos[campo.key]
      if (typeof v !== 'string' || v.trim() === '') return null
      // Los adornos que algunos escriben alrededor —«· MIS QUINCE ·»— no hacen falta aquí.
      return campo.kind === 'fecha' ? fechaLegible(v, t) : v.replace(/^[\s·•|-]+|[\s·•|-]+$/g, '')
    })
    .filter((v): v is string => v !== null)
  // Los padrinos viven dentro de `roles`; los nombres de todos, compuestos, en `names`.
  const lista = forma.form === 'campos' && forma.anfitriones !== undefined ? [] : forma.form === 'campos' && forma.list !== undefined ? datos[forma.list.key] : undefined
  const nombres = Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : []
  if (forma.form === 'campos' && forma.list?.kind === 'color' && nombres.length > 0) {
    return [...textos.slice(0, 2), t(`${nombres.length} ${nombres.length === 1 ? 'color' : 'colores'}`, `${nombres.length} ${nombres.length === 1 ? 'color' : 'colors'}`)].join(' · ')
  }
  return [...textos, ...nombres].slice(0, 3).join(' · ')
}

/**
 * Las secciones como tarjetas que se abren de una en una, numeradas en el orden de la invitación.
 *
 * Doce formularios abiertos uno debajo de otro, con un índice de puntos al lado, no decían
 * por dónde empezar ni qué faltaba. Aquí cada tarjeta plegada dice qué tiene escrito y si
 * está lista, en palabras; se abre sola la primera que falta, y abrir otra pliega la que
 * había. Lo escrito en una tarjeta plegada no se pierde: sigue montada, oculta.
 */
function Acordeon({ sections: todas, content, ejemplo, hechos, ...resto }: Props & { hechos: number }) {
  const t = useT()
  // **En el orden de la invitación, de arriba abajo** (28 de septiembre): el diseño declara sus
  // secciones como las pinta —lo vigila `editor-fiel.test`—, así que cada tarjeta que se abre lleva
  // la vista previa un poco más abajo, nunca de vuelta arriba. Antes iban por pasos fijos («portada y
  // fotos», «fecha y lugar»…) y la vista previa saltaba de la galería del final a la portada.
  const enOrden = visibles(todas)

  const [abierta, setAbierta] = useState<SectionKey | null>(() => enOrden.find((seccion) => !escrito(content, seccion)) ?? enOrden[0] ?? null)
  // En el celular la abierta ocupa la pantalla (M12), pero solo si se tocó: al llegar se ve la lista (M11).
  const [tocada, setTocada] = useState(false)

  const avisar = (seccion: SectionKey) => {
    // La vista previa va a esa parte de la invitación: se ve dónde cae lo que se edita. Con el bloque vacío se busca
    // el texto del ejemplo, que es justo lo que la vista previa está pintando.
    const aviso: AvisoDeSeccion = { seccion, textos: textosDeSeccion(escrito(content, seccion) ? content : ejemplo, seccion) }
    window.dispatchEvent(new CustomEvent(EVENTO_SECCION, { detail: aviso }))
  }

  return (
    <div className="flex flex-col gap-5">
      {/* El avance arriba, a lo ancho (E08). En el celular lo pinta la cabecera de la página (M11). */}
      <div className="flex items-center gap-4 max-[1023px]:hidden">
        <div aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-panel">
          <div className="h-full rounded-full bg-shell-deep transition-[width]" style={{ width: `${(hechos / Math.max(1, enOrden.length)) * 100}%` }} />
        </div>
        <p className="shrink-0 text-[15px] font-medium [font-variant-numeric:tabular-nums]">{t(`${hechos} de ${enOrden.length} listas`, `${hechos} of ${enOrden.length} done`)}</p>
      </div>

      <ol className="m-0 flex list-none flex-col overflow-hidden rounded-[16px] border border-line-panel bg-tarjeta p-0 max-[767px]:rounded-none max-[767px]:border-none max-[767px]:bg-transparent">
        {enOrden.map((seccion, i) => (
          <li className="border-b border-line-panel last:border-none" key={seccion}>
            <BloqueDeContenido
              {...resto}
              anexo={anexoDe(todas, seccion)}
              abierta={abierta === seccion}
              aPantallaCompleta={abierta === seccion && tocada}
              content={content}
              ejemplo={ejemplo}
              onAlternar={() => {
                const abre = abierta !== seccion || !tocada
                setAbierta(abre ? seccion : null)
                setTocada(abre)
                if (abre) avisar(seccion)
              }}
              onSiguiente={() => {
                const siguiente = enOrden[i + 1] ?? null
                setAbierta(siguiente)
                if (siguiente !== null) avisar(siguiente)
              }}
              paso={{ n: i + 1, de: enOrden.length }}
              section={seccion}
            />
          </li>
        ))}
      </ol>
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
  itinerarioDesde,
  section,
  pinta,
  content,
  media,
  ejemplo,
  abierta,
  aPantallaCompleta = abierta,
  onAlternar,
  onSiguiente,
  paso,
  fiesta = 'boda',
  anexo,
}: {
  fiesta?: Fiesta | undefined
  /** Otro bloque que se edita y se guarda dentro de esta tarjeta: el mapa en la recepción. */
  anexo?: SectionKey | undefined
  itinerarioDesde?: string | undefined
  abierta: boolean
  /** En el celular: abierta porque se tocó, a pantalla completa. Abierta sin tocar, en el celular se ve plegada. */
  aPantallaCompleta?: boolean
  onAlternar: () => void
  /** «Guardar y seguir»: guardado, abre la siguiente sección. */
  onSiguiente: () => void
  /** Qué paso es en el celular, donde la sección se abre a pantalla completa (M12). */
  paso: { n: number; de: number }
  eventId: string
  eventSlug: string
  section: SectionKey
  pinta: LoQuePinta
  content: InvitationContent
  media: readonly MediaItem[]
  ejemplo: InvitationContent
}) {
  const t = useT()
  const bloque = bloqueDe(section, fiesta, t)
  const forma = formaPara(section, pinta, fiesta)
  const cuerpoId = useId()
  const listo = escrito(content, section)
  const [state, formAction, isPending] = useActionState(GUARDAR_SIN_CAERSE, INICIAL)
  const [estado, setEstado] = useState<EstadoBloque>(() => estadoInicial(forma, content[section]))
  const formaAnexo = anexo === undefined ? undefined : formaPara(anexo, pinta, fiesta)
  const [estadoAnexo, setEstadoAnexo] = useState<EstadoBloque | undefined>(() =>
    anexo === undefined || formaAnexo === undefined ? undefined : estadoInicial(formaAnexo, content[anexo]),
  )

  // Si lo guardado cambia en el servidor por otro camino —subir la canción escribe su
  // archivo, título y artista—, el formulario se pone al día. Sin esto seguía con el archivo
  // ya borrado y el nombre de muestra, y guardarlo dejaba la invitación muda anunciando otra
  // canción. Se ajusta durante el render y **no** remontando con una `key`: remontar borraba
  // también el «Guardado» de la propia acción.
  const firma = JSON.stringify([content[section] ?? null, anexo === undefined ? null : (content[anexo] ?? null)])
  const [firmaVista, setFirmaVista] = useState(firma)
  if (firmaVista !== firma) {
    setFirmaVista(firma)
    setEstado(estadoInicial(forma, content[section]))
    if (anexo !== undefined && formaAnexo !== undefined) setEstadoAnexo(estadoInicial(formaAnexo, content[anexo]))
  }

  const error = state.status === 'error' ? errorDeGuardado(state, t, forma, formaAnexo) : null

  // Lo que el diseño trae escrito en este bloque: es el ejemplo de cada campo.
  const muestra: Record<string, string> = (() => {
    const bloque = ejemplo[section]
    if (bloque === undefined || bloque === null || Array.isArray(bloque)) return {}
    return Object.fromEntries(Object.entries(bloque as Record<string, unknown>).map(([k, v]) => [k, typeof v === 'string' ? v : '']))
  })()

  const escribirCampo = (clave: string, valor: string) =>
    setEstado((previo) => ({ ...previo, campos: { ...previo.campos, [clave]: valor } }))

  // Una foto recién subida pide guardar la sección: se envía **después** de pintar el campo con ella, para
  // que el formulario lleve la foto nueva y no la de antes.
  // (Una marca y no un estado: el campo ya se vuelve a pintar con la foto, y en ese pintado se envía.)
  const formulario = useRef<HTMLFormElement>(null)
  const guardarAhora = useRef(false)
  useEffect(() => {
    if (!guardarAhora.current) return
    guardarAhora.current = false
    formulario.current?.requestSubmit()
  })
  const pedirGuardado = useMemo(
    () => () => {
      guardarAhora.current = true
    },
    [],
  )

  // El aviso «Guardado» dura unos segundos (temporizador sin red) y vuelve con cada guardado.
  const [avisoVisto, setAvisoVisto] = useState<typeof state | null>(null)
  const avisoGuardado = state.status === 'success' && avisoVisto !== state
  useEffect(() => {
    if (state.status !== 'success') return
    const temporizador = setTimeout(() => setAvisoVisto(state), 4000)
    return () => clearTimeout(temporizador)
  }, [state])

  // «Guardar y seguir» (E08): al volver guardado, se abre la siguiente. Una foto que se guarda sola no avanza.
  const seguir = useRef<'seguir' | 'volver' | null>(null)
  useEffect(() => {
    if (state.status !== 'success' || seguir.current === null) return
    const hacia = seguir.current
    seguir.current = null
    if (hacia === 'seguir') onSiguiente()
    else onAlternar()
  }, [state, onSiguiente, onAlternar])

  const estadoTexto = listo ? (abierta ? t('Lista', 'Done') : resumenCorto(content, section, t) ?? t('Lista', 'Done')) : algoEscrito(estado) ? t('Por completar', 'To finish') : t('Sin empezar', 'Not started')

  return (
    <GuardarLaSeccion.Provider value={pedirGuardado}>
    <form
      action={formAction}
      ref={formulario}
      className={`scroll-mt-6 border-l-[3px] transition-colors ${
        abierta
          ? aPantallaCompleta
            ? 'border-l-gold bg-tarjeta max-[767px]:fixed max-[767px]:inset-0 max-[767px]:z-[60] max-[767px]:overflow-y-auto max-[767px]:border-l-0 max-[767px]:bg-bg max-[767px]:px-4 max-[767px]:pb-8'
            : 'border-l-gold bg-tarjeta max-[767px]:border-l-0 max-[767px]:bg-transparent'
          : 'border-l-transparent hover:bg-fila'
      }`}
      id={`bloque-${section}`}
    >
      {/* El aviso de la maqueta (E64): flota abajo unos segundos, aunque «Guardar y seguir» ya haya plegado la sección. */}
      {avisoGuardado ? (
        <p
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-shell-deep px-5 py-3 text-[14.5px] text-shell-ink shadow-lift motion-safe:animate-slide-up max-[767px]:bottom-[calc(152px+env(safe-area-inset-bottom))]"
          role="status"
        >
          <CheckIcon className="size-4 text-gold" />
          {t('Guardado. La vista previa ya lo enseña.', 'Saved. The preview already shows it.')}
        </p>
      ) : null}
      <input name="eventId" readOnly type="hidden" value={eventId} />
      <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
      <input name="section" readOnly type="hidden" value={section} />
      {/* Lo que se guarda. Se compone de lo que hay arriba; nadie lo teclea. */}
      <input name="value" readOnly type="hidden" value={JSON.stringify(aValor(forma, estado))} />
      {anexo === undefined || formaAnexo === undefined || estadoAnexo === undefined ? null : (
        <>
          <input name="anexoSection" readOnly type="hidden" value={anexo} />
          <input name="anexoValue" readOnly type="hidden" value={JSON.stringify(aValor(formaAnexo, estadoAnexo))} />
        </>
      )}

      {/* En el celular la sección abierta ocupa la pantalla (M12): volver, en qué paso va y su título en grande. */}
      {aPantallaCompleta ? (
        <div className="sticky top-0 z-10 -mx-4 mb-2 bg-bg px-4 pt-3 pb-2 min-[768px]:hidden">
          <div className="flex items-center gap-3 rounded-[18px] bg-bg-raised px-3 py-2.5 shadow-[0_8px_24px_-12px_rgb(12_36_32/0.35)]">
            <button aria-label={t('Volver a Mi invitación', 'Back to My invitation')} className="grid size-11 cursor-pointer place-items-center rounded-xl" onClick={onAlternar} type="button">
              <ChevronIcon className="size-5 rotate-90" />
            </button>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="text-[13px] text-ink-mute">{t('Mi invitación', 'My invitation')}</span>
              <span className="truncate text-[16px] font-medium">{bloque.titulo}</span>
            </span>
            <span className="shrink-0 pr-1 text-[14px] text-ink-mute">
              {t(`Paso ${paso.n} de ${paso.de}`, `Step ${paso.n} of ${paso.de}`)}
            </span>
          </div>
        </div>
      ) : null}

      <h3 className={`m-0 ${aPantallaCompleta ? 'max-[767px]:hidden' : ''}`}>
        <button
          aria-controls={`${cuerpoId}-cuerpo`}
          aria-describedby={`${cuerpoId}-estado ${cuerpoId}-resumen`}
          aria-expanded={abierta}
          aria-labelledby={`${cuerpoId}-titulo`}
          className="flex min-h-14 w-full cursor-pointer items-center gap-3.5 px-5 py-3.5 text-left max-[767px]:min-h-[72px] max-[767px]:px-0"
          onClick={onAlternar}
          type="button"
        >
          <span aria-hidden className="grid size-6 shrink-0 place-items-center min-[768px]:hidden">
            {listo ? (
              <CheckIcon className="size-5 text-ok-deep" />
            ) : (
              <span className={`size-[22px] rounded-full border-[1.5px] ${algoEscrito(estado) ? 'border-gold' : 'border-dashed border-line-panel-strong'}`} />
            )}
          </span>
          <span className={`min-w-0 grow text-[15.5px] text-ink max-[767px]:text-[17px] ${listo ? '' : 'font-medium'}`} id={`${cuerpoId}-titulo`}>
            {bloque.titulo}
          </span>
          {abierta ? null : (
            <span className="sr-only" id={`${cuerpoId}-resumen`}>
              {listo ? resumen(content, section, forma, t) || bloque.descripcion : bloque.descripcion}
            </span>
          )}
          <span
            className={`shrink-0 text-[14px] ${(abierta && aPantallaCompleta) || (!listo && algoEscrito(estado)) ? 'text-gold-deep' : listo ? 'text-ink-mute max-[767px]:text-ok-deep' : 'text-ink-mute'}`}
            id={`${cuerpoId}-estado`}
          >
            {estadoTexto}
          </span>
          <ChevronIcon className={`size-4 shrink-0 text-ink-mute transition-transform ${abierta ? 'rotate-180' : ''}`} />
        </button>
      </h3>

      <div className={`flex flex-col gap-4 px-5 pb-5 max-[767px]:px-0 ${aPantallaCompleta ? '' : 'max-[767px]:hidden'}`} hidden={!abierta} id={`${cuerpoId}-cuerpo`}>
      <div className="flex flex-col gap-1 min-[768px]:hidden">
        <p aria-hidden className="font-display text-[34px] leading-tight font-medium">
          {bloque.titulo}
        </p>
        <p className="text-[16px] text-ink-soft">{bloque.descripcion}</p>
      </div>
      {section === 'itinerary' && itinerarioDesde !== undefined ? (
        <div className="flex flex-col items-start gap-3 rounded-[14px] bg-bg-top p-4">
          <p className="text-[13px] leading-[1.6] text-ink-soft">
            {t('Los momentos de la noche salen de tu', 'The moments of the night come from your')}{' '}
            <strong className="font-medium text-ink">{t('Cronograma del día', 'Day schedule')}</strong>
            {t(': marca en cada momento «Sale en la invitación» y elige su icono. Así hay una sola lista y la invitación nunca dice otra hora.', ': on each moment check “Shows on the invitation” and choose its icon. That way there is only one list and the invitation never says a different time.')}
          </p>
          <PanelButton href={itinerarioDesde} variant="primary">
            {t('Ir al cronograma', 'Go to the schedule')}
          </PanelButton>
        </div>
      ) : forma.form === 'campos' ? (
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
          {anexo === undefined || formaAnexo?.form !== 'campos' || estadoAnexo === undefined ? null : (
            <div className="flex flex-col gap-3 border-t border-line-panel pt-4">
              <p className="m-0 flex items-center gap-2 text-[13px] text-ink">
                <IconoDeBloque seccion={anexo} />
                {t('Cómo llegar', 'How to get there')}
              </p>
              <div className="grid gap-3 min-[560px]:grid-cols-2">
                {formaAnexo.fields.map((campo) => (
                  <CampoDeBloque
                    campo={campo}
                    eventId={eventId}
                    eventSlug={eventSlug}
                    key={campo.key}
                    media={media}
                    onChange={(valor) => setEstadoAnexo((previo) => (previo === undefined ? previo : { ...previo, campos: { ...previo.campos, [campo.key]: valor } }))}
                    valor={estadoAnexo.campos[campo.key] ?? ''}
                  />
                ))}
              </div>
            </div>
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
      <div
        className={`flex flex-wrap items-center justify-end gap-2.5 max-[767px]:sticky max-[767px]:bottom-0 max-[767px]:z-10 max-[767px]:-mx-4 max-[767px]:flex-col-reverse max-[767px]:items-stretch max-[767px]:border-t max-[767px]:border-line-panel max-[767px]:bg-bg/96 max-[767px]:px-4 max-[767px]:pt-4 max-[767px]:pb-[max(env(safe-area-inset-bottom),16px)] max-[767px]:backdrop-blur ${section === 'itinerary' && itinerarioDesde !== undefined ? 'hidden' : ''}`}
      >
        <span className="max-[767px]:hidden">
          <PanelButton onClick={onAlternar}>{t('Cancelar', 'Cancel')}</PanelButton>
        </span>
        <span className="min-[768px]:hidden">
          <SubmitButton className="w-full" onClick={() => {
              seguir.current = 'volver'
            }} pending={isPending} pendingLabel={t('Guardando…', 'Saving…')} variant="default">
            {t('Guardar y volver', 'Save and go back')}
          </SubmitButton>
        </span>
        <SubmitButton className="max-[767px]:min-h-13 max-[767px]:w-full" onClick={() => {
            seguir.current = 'seguir'
          }} pending={isPending} pendingLabel={t('Guardando…', 'Saving…')} variant="primary">
          {t('Guardar y seguir', 'Save and continue')}
        </SubmitButton>
      </div>
      </div>
    </form>
    </GuardarLaSeccion.Provider>
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
  const t = useT()
  const id = useId()
  const pistaId = `${id}-pista`
  const rotulo = etiqueta ?? traducir(campo.label, t)

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${campo.kind === 'parrafo' || campo.kind === 'imagen' || campo.kind === 'icono' || campo.kind === 'fecha' || campo.kind === 'ubicacion' || campo.anchoCompleto === true ? 'min-[560px]:col-span-2' : ''}`}>
      {campo.kind === 'imagen' || campo.kind === 'icono' ? (
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
      ) : campo.kind === 'icono' ? (
        <SelectorDeIcono id={id} onChange={onChange} rotulo={rotulo} valor={valor} />
      ) : campo.kind === 'ubicacion' ? (
        <CampoUbicacion describedBy={campo.hint === undefined ? undefined : pistaId} id={id} onChange={onChange} valor={valor} />
      ) : campo.kind === 'fecha' ? (
        <CampoFechaHora id={id} onChange={onChange} valor={valor} />
      ) : campo.kind === 'parrafo' ? (
        <textarea
          aria-describedby={campo.hint === undefined ? undefined : pistaId}
          className={`${FIELD_CLASS} leading-[1.6]`}
          id={id}
          maxLength={campo.max}
          onChange={(evento) => onChange(evento.target.value)}
          placeholder={ejemplo === undefined || ejemplo === '' ? undefined : `${t('Ej.:', 'E.g.:')} ${ejemplo}`}
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
            maxLength={campo.max}
            onChange={(evento) => onChange(evento.target.value)}
            placeholder={ejemplo === undefined || ejemplo === '' ? undefined : `${t('Ej.:', 'E.g.:')} ${ejemplo}`}
            type="text"
            value={valor}
          />
        </div>
      )}
      {/* Cerca del tope, cuánto queda: el campo no deja pasarse (el tope es el del guardado, `topeDeTexto`). */}
      {campo.max !== undefined && valor.length >= campo.max * 0.8 ? (
        <p aria-live="polite" className={`text-right font-mono text-[12px] ${valor.length >= campo.max ? 'text-gold-deep' : 'text-ink-mute'}`}>
          {valor.length} / {campo.max}
        </p>
      ) : null}

      {campo.hint === undefined ? null : (
        <p className="text-[12px] leading-[1.5] text-ink-mute" id={pistaId}>
          {traducir(campo.hint, t)}
        </p>
      )}
    </div>
  )
}

/**
 * El icono de un momento del itinerario, elegido **mirándolo**: los dibujos del propio diseño,
 * con su nombre. Antes era un campo donde había que escribir «church» o «corona».
 */
function SelectorDeIcono({ id, rotulo, valor, onChange }: { id: string; rotulo: string; valor: string; onChange: (v: string) => void }) {
  const opciones = useContext(IconosDelDiseno)
  if (opciones.length === 0) {
    return <input aria-labelledby={`${id}-rotulo`} className={FIELD_CLASS} onChange={(e) => onChange(e.target.value)} type="text" value={valor} />
  }
  return (
    <div aria-label={rotulo} className="flex flex-wrap gap-2" role="group">
      {opciones.map((o) => {
        const activo = o.clave === valor
        return (
          <button
            aria-label={o.nombre}
            aria-pressed={activo}
            className={`flex w-[76px] cursor-pointer flex-col items-center gap-1 rounded-[12px] border bg-white px-1.5 py-2 text-ink transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
              activo ? 'border-ink ring-2 ring-ink' : 'border-line-panel hover:border-line-panel-strong'
            }`}
            key={o.clave}
            onClick={() => onChange(o.clave)}
            type="button"
          >
            <span aria-hidden className="grid size-10 place-items-center [&_svg]:max-h-10 [&_svg]:max-w-10">
              {o.dibujo}
            </span>
            <span className="text-center text-[12px] leading-tight text-ink-soft">{o.nombre}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * La ubicación: se pega el enlace de Google Maps o se escribe la dirección, y se ve el mapa
 * que verán los invitados. Una dirección escrita se guarda como búsqueda de Google Maps; un
 * enlace corto de «Compartir» (`maps.app.goo.gl`) lo resuelve el servidor al guardar.
 */
/**
 * La ubicación: un enlace de Google Maps o una dirección escrita.
 *
 * **Lo escrito pasa al formulario en cada tecla** y el mapa de muestra se refresca al salir del campo,
 * **en un hueco ya reservado**. Antes el valor se pasaba solo al salir del campo: al pulsar «Guardar» el
 * formulario se enviaba con la ubicación vieja y, en el mismo clic, aparecía el mapa (200 px) entre el
 * campo y el botón, que saltaba hacia abajo; el clic caía en el vacío y no se guardaba nada.
 */
function CampoUbicacion({ id, valor, onChange, describedBy }: { id: string; valor: string; onChange: (v: string) => void; describedBy?: string | undefined }) {
  const t = useT()
  const [escrito, setEscrito] = useState(valor)
  const [vista, setVista] = useState(valor)
  const mapa = mapaIncrustado({ href: vista })
  const corto = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl)\//i.test(vista)
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <PinIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-mute" />
        <input
          aria-describedby={describedBy}
          className={`${FIELD_CLASS} pl-10`}
          id={id}
          onBlur={() => setVista(enlaceDeUbicacion(escrito))}
          onChange={(e) => {
            setEscrito(e.target.value)
            onChange(enlaceDeUbicacion(e.target.value))
          }}
          placeholder={t('https://maps.app.goo.gl/… o Av. Arce 2020, La Paz', 'https://maps.app.goo.gl/… or Av. Arce 2020, La Paz')}
          type="text"
          value={escrito}
        />
      </div>
      {/* Siempre del mismo alto: que aparezca el mapa no mueve el botón de guardar. */}
      <div className="grid h-[200px] w-full place-items-center overflow-hidden rounded-[12px] border border-line-panel bg-bg-top">
        {mapa !== null ? (
          <iframe className="size-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={mapa} title={t('Vista del mapa', 'Map view')} />
        ) : (
          <p className="px-6 text-center text-[12px] text-ink-mute">
            {corto ? t('Al guardar buscamos el lugar de ese enlace y aparece el mapa.', 'When you save, we look up the place for that link and the map appears.') : t('Aquí verás el mapa de la ubicación.', 'You’ll see the location’s map here.')}
          </p>
        )}
      </div>
    </div>
  )
}

const erroresAlQuitar = (t: T): Record<string, string> => ({
  in_use: t('Esa foto la usa otra parte de la invitación. Cámbiala allí primero.', 'Another part of the invitation uses that photo. Change it there first.'),
  not_found: t('Esa foto ya no está.', 'That photo is no longer there.'),
})

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
  const t = useT()
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
      const r = await sinCaerse(removeMediaAction, { status: 'error', message: 'network' })({ status: 'idle' }, datos)
      if (r.status === 'error') setAviso(erroresAlQuitar(t)[r.message] ?? t('No se pudo quitar la foto.', 'The photo couldn’t be removed.'))
    })
  }

  const marca = (elegida: boolean) => (elegida ? 'border-ink ring-2 ring-ink' : 'border-line-panel hover:border-line-panel-strong')

  return (
    <div aria-labelledby={rotuloId} className="flex flex-col gap-2.5" role="group">
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(76px,1fr))]">
        <button aria-pressed={valor === ''} className={`${MINIATURA} ${marca(valor === '')}`} onClick={() => onChange('')} type="button">
          <span className="px-1 text-center text-[12px] leading-tight text-ink-mute">{t('Sin foto', 'No photo')}</span>
        </button>

        {valor === '' || conocida ? null : (
          <button aria-label={t('Usar la fotografía guardada', 'Use the saved photo')} aria-pressed className={`${MINIATURA} ${marca(true)}`} onClick={() => onChange(valor)} type="button">
            {/* La sirve /media/[id], que no pasa por el optimizador: lleva la puerta de contraseña del evento. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="size-full object-cover" loading="lazy" src={`/media/${valor}`} />
          </button>
        )}

        {fotos.map((foto) => (
          <div className="group relative" key={foto.id}>
            <button
              aria-label={t(`Usar ${foto.originalName}`, `Use ${foto.originalName}`)}
              aria-pressed={valor === foto.id}
              className={`${MINIATURA} ${marca(valor === foto.id)}`}
              onClick={() => onChange(foto.id)}
              title={foto.fromGuest ? t(`${foto.originalName} · la subió un invitado`, `${foto.originalName} · uploaded by a guest`) : foto.originalName}
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
                aria-label={t(`Quitar ${foto.originalName}`, `Remove ${foto.originalName}`)}
                className="absolute top-1 right-1 grid size-10 cursor-pointer place-items-center rounded-full bg-white/95 text-ink-soft shadow hover:text-danger min-[860px]:hidden min-[860px]:size-6 min-[860px]:group-hover:grid min-[860px]:group-focus-within:grid"
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
  const t = useT()
  const pistas = media.filter(esPista)
  const conocida = pistas.some((pista) => pista.id === valor)

  return (
    <div className="flex flex-col gap-2">
      <select className={FIELD_CLASS} id={id} onChange={(evento) => onChange(evento.target.value)} value={valor}>
        <option value="">{t('Sin música', 'No music')}</option>
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
        <p className="text-[12px] leading-[1.5] text-ink-mute">
          {t('Todavía no subiste ninguna. Súbela con el botón de aquí arriba: queda elegida al subirla.', 'You haven’t uploaded any yet. Upload it with the button above: it is selected once uploaded.')}
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
  const t = useT()
  const item = traducir(lista.itemLabel, t)
  if (lista.kind === 'color') return <SelectorDePaleta max={lista.max} onChange={onChange} rotulo={traducir(lista.label, t)} valores={valores} />
  const campo: Campo = { key: lista.key, label: lista.itemLabel, kind: lista.kind === 'imagen' ? 'imagen' : 'texto', ...(lista.maxTexto === undefined ? {} : { max: lista.maxTexto }) }

  return (
    <div className="flex flex-col gap-2.5">
      <p className={LABEL_CLASS}>{lista.label}</p>

      {valores.length === 0 ? (
        <p className="text-[12px] text-ink-soft">{t('Ninguno todavía. Si no hay, déjalo así: la invitación no pinta este grupo.', 'None yet. If there are none, leave it like this: the invitation won’t show this group.')}</p>
      ) : (
        valores.map((valor, indice) => (
          <div className="flex items-end gap-2" key={indice}>
            <div className="min-w-0 grow">
              <CampoDeBloque
                campo={campo}
                etiqueta={`${item.charAt(0).toUpperCase()}${item.slice(1)} ${indice + 1}`}
                media={media}
                onChange={(nuevo) => onChange(valores.map((v, i) => (i === indice ? nuevo : v)))}
                valor={valor}
              />
            </div>
            <IconButton
              className="mb-1.5 hover:border-danger hover:text-danger"
              label={t(`Quitar ${item} ${indice + 1}`, `Remove ${item} ${indice + 1}`)}
              onClick={() => onChange(valores.filter((_, i) => i !== indice))}
            >
              <TrashIcon className="size-4" />
            </IconButton>
          </div>
        ))
      )}

      <div>
        <PanelButton disabled={valores.length >= lista.max} onClick={() => onChange([...valores, ''])}>
          {t(`Añadir ${item}`, `Add ${item}`)}
        </PanelButton>
      </div>
    </div>
  )
}

/**
 * La paleta del código de vestimenta: los colores de siempre a un toque, y cualquier otro con
 * el selector del sistema. Lo elegido se ve arriba, en el orden en que saldrá en la invitación.
 */
function SelectorDePaleta({ rotulo, valores, onChange, max }: { rotulo: string; valores: readonly string[]; onChange: (v: readonly string[]) => void; max: number }) {
  const t = useT()
  const id = useId()
  const elegidos = valores.map((v) => v.toLowerCase())
  const [otro, setOtro] = useState(COLORES_DE_VESTIMENTA[0]!.hex)
  const lleno = elegidos.length >= max
  const alternar = (hex: string) =>
    onChange(elegidos.includes(hex) ? elegidos.filter((v) => v !== hex) : lleno ? elegidos : [...elegidos, hex])
  // Los de la lista y, detrás, los que se añadieron a mano: todos se eligen y se quitan igual.
  const opciones = [
    ...COLORES_DE_VESTIMENTA,
    ...elegidos.filter((hex) => !COLORES_DE_VESTIMENTA.some((c) => c.hex === hex)).map((hex) => ({ nombre: t('Tu color', 'Your color'), hex })),
  ]

  return (
    <div aria-labelledby={`${id}-rotulo`} className="flex flex-col gap-3" role="group">
      <div className="flex flex-col gap-1">
        <p className={LABEL_CLASS} id={`${id}-rotulo`}>
          {rotulo}
        </p>
        <p className="text-[12px] leading-[1.6] text-ink-soft">
          {t('Los colores que sugieres a tus invitados para vestirse. Salen como círculos debajo del código de vestimenta; toca uno para elegirlo o quitarlo. Sin colores, la invitación no pinta la paleta.', 'The colors you suggest your guests wear. They show as circles below the dress code; tap one to choose or remove it. With no colors, the invitation won’t show the palette.')}
        </p>
      </div>

      <ul className="grid gap-x-2 gap-y-3 [grid-template-columns:repeat(auto-fill,minmax(64px,1fr))]">
        {opciones.map((color) => {
          const activo = elegidos.includes(color.hex)
          return (
            <li key={color.hex}>
              <button
                aria-pressed={activo}
                className="group flex w-full cursor-pointer flex-col items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!activo && lleno}
                onClick={() => alternar(color.hex)}
                type="button"
              >
                <span
                  className={`relative size-10 rounded-full border transition group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ink ${
                    activo ? 'border-ink ring-2 ring-ink ring-offset-2' : 'border-black/10 group-hover:scale-105'
                  }`}
                  style={{ background: color.hex }}
                >
                  {/* La marca va sobre su propio disco blanco: sobre el color cambiaba de tono con cada uno. */}
                  {activo ? (
                    <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-ink text-white">
                      <CheckIcon className="size-3" />
                    </span>
                  ) : null}
                </span>
                <span className={`text-center text-[12px] leading-tight ${activo ? 'text-ink' : 'text-ink-soft'}`}>{color.nombre}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[12.5px] text-ink-soft" htmlFor={`${id}-otro`}>
          {t('Otro color', 'Another color')}
        </label>
        <input className="h-9 w-12 cursor-pointer rounded-[10px] border border-line-panel bg-white p-1" id={`${id}-otro`} onChange={(e) => setOtro(e.target.value.toLowerCase())} type="color" value={otro} />
        <PanelButton disabled={lleno || elegidos.includes(otro)} onClick={() => alternar(otro)}>
          {t('Añadir color', 'Add color')}
        </PanelButton>
        <span className="text-[12px] text-ink-mute">{t(`${elegidos.length} de ${max} elegidos`, `${elegidos.length} of ${max} chosen`)}</span>
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
  filas: guardadas,
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
  const t = useT()
  const item = traducir(forma.itemLabel, t)
  // La galería enseña todos los huecos que pinta el diseño —uno en «Mascarada», seis en
  // «Botánica»—, cada uno con su foto, sin añadir ni quitar casillas.
  const fijas = forma.fijas === true
  const filas =
    fijas && guardadas.length < forma.max
      ? [...guardadas, ...Array.from({ length: forma.max - guardadas.length }, () => filaVacia(forma.fields))]
      : guardadas
  const mover = (desde: number, hasta: number) => {
    if (hasta < 0 || hasta >= filas.length) return
    const copia = [...filas]
    const [movida] = copia.splice(desde, 1)
    if (movida === undefined) return
    copia.splice(hasta, 0, movida)
    onChange(copia)
  }

  if (fijas) return <GaleriaDeFotos eventId={eventId} eventSlug={eventSlug} filas={filas} forma={forma} media={media} onChange={onChange} />

  return (
    <div className="flex flex-col gap-3">
      {filas.length === 0 ? (
        <p className="text-[12px] text-ink-soft">{t('Todavía no hay ninguna. El diseño deja su sitio sin pintar.', 'None yet. The design leaves its space empty.')}</p>
      ) : (
        filas.map((fila, indice) => (
          <div className="flex flex-col gap-3 rounded-[14px] border border-line-panel bg-white p-3.5 shadow-[0_1px_0_rgb(0_0_0/0.02)]" key={indice}>
            {/* Cabecera de la fila: cuál es y sus mandos, arriba, donde se buscan. */}
            <div className="flex items-center gap-2 border-b border-line-panel pb-2.5">
              <span className="grid size-6 place-items-center rounded-full bg-bg-top text-[12px] font-medium text-ink-soft">{indice + 1}</span>
              <span className="truncate text-[13px] text-ink">
                {fila.label?.trim() || fila.title?.trim() || `${item.charAt(0).toUpperCase()}${item.slice(1)} ${indice + 1}`}
                {fila.time?.trim() ? <span className="ml-2 text-ink-mute">{fila.time}</span> : null}
              </span>
              <span className="ml-auto flex gap-1.5">
                <IconButton disabled={indice === 0} label={t(`Subir ${item} ${indice + 1}`, `Move ${item} ${indice + 1} up`)} onClick={() => mover(indice, indice - 1)}>
                  <ChevronIcon className="size-4 rotate-180" />
                </IconButton>
                <IconButton disabled={indice === filas.length - 1} label={t(`Bajar ${item} ${indice + 1}`, `Move ${item} ${indice + 1} down`)} onClick={() => mover(indice, indice + 1)}>
                  <ChevronIcon className="size-4" />
                </IconButton>
                <IconButton
                  className="hover:border-danger hover:text-danger"
                  label={t(`Quitar ${item} ${indice + 1}`, `Remove ${item} ${indice + 1}`)}
                  onClick={() => onChange(filas.filter((_, i) => i !== indice))}
                >
                  <TrashIcon className="size-4" />
                </IconButton>
              </span>
            </div>
            <div className="grid gap-3 min-[560px]:grid-cols-2">
              {forma.fields.map((campo) => (
                <CampoDeBloque
                  campo={campo}
                  eventId={eventId}
                  eventSlug={eventSlug}
                  etiqueta={`${traducir(campo.label, t)} · ${item} ${indice + 1}`}
                  key={campo.key}
                  media={media}
                  onChange={(valor) =>
                    onChange(filas.map((f, i) => (i === indice ? { ...f, [campo.key]: valor } : f)))
                  }
                  valor={fila[campo.key] ?? ''}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <div>
        <PanelButton
          disabled={filas.length >= forma.max}
          onClick={() => onChange([...filas, filaVacia(forma.fields)])}
        >
          {t(`Añadir ${item}`, `Add ${item}`)}
        </PanelButton>
      </div>
    </div>
  )
}

/**
 * La galería: los huecos de foto que pinta el diseño, como una rejilla de casillas.
 *
 * Se ve de un vistazo qué casillas tienen foto y cuáles no; al tocar una, debajo se abre su
 * selector (la biblioteca del evento y «Subir una fotografía») y su rótulo, si el diseño lo pinta.
 */
function GaleriaDeFotos({
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
  const t = useT()
  const item = traducir(forma.itemLabel, t)
  const [activa, setActiva] = useState(0)
  const fila = filas[activa] ?? {}
  const conFoto = filas.filter((f) => (f.imageId ?? '') !== '').length
  const cambiar = (clave: string, valor: string) => onChange(filas.map((f, i) => (i === activa ? { ...f, [clave]: valor } : f)))
  const mover = (hasta: number) => {
    if (hasta < 0 || hasta >= filas.length) return
    const copia = [...filas]
    const [movida] = copia.splice(activa, 1)
    if (movida === undefined) return
    copia.splice(hasta, 0, movida)
    onChange(copia)
    setActiva(hasta)
  }
  const nombre = (i: number) => t(`Foto ${i + 1}`, `Photo ${i + 1}`)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-ink-soft">
          {filas.length === 1 ? t('Tu invitación tiene una foto. Toca la casilla para elegirla.', 'Your invitation has one photo. Tap the box to choose it.') : t(`Tu invitación tiene ${filas.length} fotos, en este orden. Toca una casilla para elegir la suya.`, `Your invitation has ${filas.length} photos, in this order. Tap a box to choose its photo.`)}
        </p>
        <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${conFoto === filas.length ? 'bg-sage/15 text-sage' : 'bg-bg-top text-ink-soft'}`}>
          {t(`${conFoto} de ${filas.length} con foto`, `${conFoto} of ${filas.length} with a photo`)}
        </span>
      </div>

      <ul className={`grid gap-2 min-[560px]:gap-3 ${filas.length === 1 ? 'max-w-[160px]' : 'grid-cols-3 min-[560px]:[grid-template-columns:repeat(auto-fill,minmax(112px,1fr))]'}`}>
        {filas.map((f, i) => {
          const id = f.imageId ?? ''
          const elegida = i === activa
          return (
            <li key={i}>
              <button
                aria-label={`${nombre(i)}${id === '' ? t(', sin foto', ', no photo') : ''}`}
                aria-pressed={elegida}
                className={`group relative block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-[14px] border transition ${
                  elegida ? 'border-ink ring-2 ring-ink ring-offset-2' : id === '' ? 'border-dashed border-line-panel-strong hover:border-ink' : 'border-line-panel hover:-translate-y-0.5 hover:shadow-md'
                } ${id === '' ? 'bg-bg-top' : 'bg-white'}`}
                onClick={() => setActiva(i)}
                type="button"
              >
                {id === '' ? (
                  <span className="flex size-full flex-col items-center justify-center gap-2 text-ink-mute">
                    <span className="grid size-10 place-items-center rounded-full border border-line-panel bg-white text-ink-soft transition group-hover:text-ink">
                      <PlusIcon className="size-4" />
                    </span>
                    <span className="hidden text-[12px] tracking-[0.12em] uppercase min-[560px]:inline">{t('Añadir', 'Add')}</span>
                  </span>
                ) : (
                  <>
                    {/* La sirve /media/[id], que no pasa por el optimizador: lleva la puerta de contraseña del evento. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="" className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" src={`/media/${id}`} />
                    <span aria-hidden className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-white/95 text-sage shadow">
                      <CheckIcon className="size-3" />
                    </span>
                  </>
                )}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 bottom-0 px-2.5 pt-6 pb-2 text-left text-[12px] font-medium ${id === '' ? 'text-ink-soft' : 'bg-gradient-to-t from-black/60 to-transparent text-white'}`}
                >
                  {nombre(i)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-4 rounded-[16px] border border-line-panel bg-white p-4 shadow-[0_1px_0_rgb(0_0_0/0.02)]">
        <div className="flex items-center gap-2 border-b border-line-panel pb-3">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-line-panel bg-bg-top text-ink-mute">
            {(fila.imageId ?? '') === '' ? (
              <CameraIcon className="size-4" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img alt="" className="size-full object-cover" src={`/media/${fila.imageId}`} />
            )}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[14px] text-ink">{nombre(activa)}</span>
            <span className="text-[12px] text-ink-mute">{(fila.imageId ?? '') === '' ? t('Elige una de tus fotos o sube una nueva.', 'Choose one of your photos or upload a new one.') : t('Toca otra de tus fotos para cambiarla.', 'Tap another of your photos to change it.')}</span>
          </span>
          <span className="ml-auto flex shrink-0 gap-1.5">
            {(fila.imageId ?? '') === '' ? null : (
              <IconButton className="hover:border-danger hover:text-danger" label={t(`Quitar la foto de la ${nombre(activa).toLowerCase()}`, `Remove the photo from ${nombre(activa).toLowerCase()}`)} onClick={() => cambiar('imageId', '')}>
                <TrashIcon className="size-4" />
              </IconButton>
            )}
            {filas.length > 1 ? (
              <>
              <IconButton disabled={activa === 0} label={t(`Mover la ${nombre(activa).toLowerCase()} antes`, `Move ${nombre(activa).toLowerCase()} earlier`)} onClick={() => mover(activa - 1)}>
                <ChevronIcon className="size-4 rotate-90" />
              </IconButton>
              <IconButton disabled={activa === filas.length - 1} label={t(`Mover la ${nombre(activa).toLowerCase()} después`, `Move ${nombre(activa).toLowerCase()} later`)} onClick={() => mover(activa + 1)}>
                <ChevronIcon className="size-4 -rotate-90" />
              </IconButton>
              </>
            ) : null}
          </span>
        </div>
        <div className="grid gap-3 min-[560px]:grid-cols-2">
          {forma.fields.map((campo) => (
            <CampoDeBloque
              campo={campo}
              eventId={eventId}
              eventSlug={eventSlug}
              etiqueta={`${traducir(campo.label, t)} · ${item} ${activa + 1}`}
              key={`${campo.key}-${activa}`}
              media={media}
              onChange={(valor) => cambiar(campo.key, valor)}
              valor={fila[campo.key] ?? ''}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
