'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef, useState, type RefObject } from 'react'
import { checkInByGroupAction, registrarSinPaseAction, type SinPaseState, undoCheckInAction } from '@/app/_acciones/checkin/actions'
import { CheckIcon, CloseIcon, ScanIcon, UsersIcon } from '@/shared/design/ui/icons'
import { botonClases, FIELD_CLASS, Iniciales, LABEL_CLASS, SearchField } from '@/shared/design/ui/panel/PanelKit'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import type { EstadoDeLlegada } from '../domain/lista-de-llegadas'
import { useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'

export type PersonaDeRecepcion = { readonly id: string; readonly nombre: string; readonly puerta: string | null; readonly registradas: number }

export type FilaDeIngreso = {
  readonly clave: string
  readonly invitacionId: string
  readonly personaId: string | null
  readonly nombre: string
  readonly invitacion: string | null
  readonly estado: EstadoDeLlegada
  /** «19:40», en hora de Bolivia, ya formateada. */
  readonly hora: string | null
  readonly mesa: string | null
  readonly vip: boolean
  /** El código corto del pase de su invitación (`K7P3X`). */
  readonly codigo?: string | null
}

export type MesaDelSalon = { readonly id: string; readonly label: string; readonly libres: number; readonly invitaciones: readonly string[] }

type Filtro = 'por_llegar' | 'dentro' | 'no_viene' | 'todos'

const filtros = (t: T): ReadonlyArray<{ clave: Filtro; texto: string }> => [
  { clave: 'por_llegar', texto: t('Por llegar', 'Expected') },
  { clave: 'dentro', texto: t('Dentro', 'Inside') },
  { clave: 'no_viene', texto: t('No vienen', 'Not coming') },
  { clave: 'todos', texto: t('Todos', 'All') },
]

const normal = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const horaDe = (cuando: Date) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' }).format(cuando)

const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 min-[860px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_64px_130px_120px]'

/**
 * El control de la puerta. **Se entra con el pase**: escaneando su QR o escribiendo su código corto.
 * Registrar a alguien sin pase existe, pero es el último recurso y así se ve (pedido por el usuario).
 * Debajo, la lista de invitados como tabla: quién, de qué invitación y mesa, y su estado.
 *
 * **No se refresca sola**, y es a propósito: una pantalla que se recarga cada pocos segundos mueve
 * la lista bajo el dedo de quien está registrando. Lo que se hace aquí se ve al momento; lo que
 * escanea la recepción desde otro teléfono se trae con el botón «Actualizar», cuando se quiere.
 */
export function ControlDeIngreso({
  filas,
  eventId,
  eventSlug,
  escanerHref,
  recepcion,
  mesas = [],
}: {
  /** Las mesas del salón, con sus lugares libres y qué invitaciones sienta: «Llegó alguien sin pase» elige una. */
  mesas?: readonly MesaDelSalon[]
  filas: readonly FilaDeIngreso[]
  eventId: string
  eventSlug: string
  escanerHref: string
  /** Quiénes reciben en la puerta y dónde se suman. `null` para la propia recepción. */
  recepcion: { readonly gestionarHref: string; readonly personas: readonly PersonaDeRecepcion[] } | null
}) {
  const t = useT()
  const router = useRouter()
  const [filtro, setFiltro] = useState<Filtro>('por_llegar')
  const [busqueda, setBusqueda] = useState('')
  const [codigo, setCodigo] = useState('')
  /** La invitación que encontró el código, esperando a que se confirme quién entra. */
  const [porCodigo, setPorCodigo] = useState<{ invitacionId: string; marcadas: ReadonlySet<string> } | null>(null)
  const [entraron, setEntraron] = useState<Readonly<Record<string, string>>>({})
  const [salieron, setSalieron] = useState<ReadonlySet<string>>(new Set())
  const [confirmar, setConfirmar] = useState<string | null>(null)
  /** Qué invitaciones de varias personas están desplegadas. Plegadas, la lista se lee de un vistazo. */
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(new Set())
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  /** Lo que hay que decir sin que sea un fallo: «ya estaba dentro». Rojo aquí sería mentir. */
  const [nota, setNota] = useState<string | null>(null)
  /** «Código del pase» abre su diálogo (E67). */
  const dialogoCodigo = useRef<HTMLDialogElement>(null)
  const dialogoSinPase = useRef<HTMLDialogElement>(null)
  // Con quién puede venir: cada invitación una vez, con su mesa.
  const invitaciones = [...new Map(filas.map((f) => [f.invitacionId, { id: f.invitacionId, nombre: f.invitacion ?? f.nombre, mesa: f.mesa }])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const [codigoAbierto, setCodigoAbierto] = useState(false)
  const abrirCodigo = () => {
    if (dialogoCodigo.current?.open === false) dialogoCodigo.current.showModal()
    setCodigoAbierto(true)
  }

  // Lo registrado aquí cuenta ya, aunque el servidor aún no haya vuelto a pintar.
  const vistas = filas.map((f) => {
    if (entraron[f.clave] !== undefined && f.estado !== 'dentro') return { ...f, estado: 'dentro' as const, hora: entraron[f.clave] ?? null }
    if (salieron.has(f.clave) && f.estado === 'dentro') return { ...f, estado: 'por_llegar' as const, hora: null }
    return f
  })
  const cuantos = (f: Filtro) => (f === 'todos' ? vistas.length : vistas.filter((x) => x.estado === f).length)
  const dentro = cuantos('dentro')
  const esperados = dentro + cuantos('por_llegar')
  const avance = esperados === 0 ? 0 : dentro / esperados

  const buscado = normal(busqueda.trim())
  const visibles = vistas
    .filter((f) => buscado !== '' || filtro === 'todos' || f.estado === filtro)
    .filter((f) => buscado === '' || normal(`${f.nombre} ${f.invitacion ?? ''} ${f.codigo ?? ''}`).includes(buscado))
    .sort((a, b) => (a.estado === 'dentro' && b.estado === 'dentro' ? (b.hora ?? '').localeCompare(a.hora ?? '') : a.nombre.localeCompare(b.nombre, 'es')))

  const porInvitacion: Array<{ id: string; filas: FilaDeIngreso[] }> = []
  for (const f of visibles) {
    const bloque = porInvitacion.find((b) => b.id === f.invitacionId)
    if (bloque) bloque.filas.push(f)
    else porInvitacion.push({ id: f.invitacionId, filas: [f] })
  }

  const recientes = vistas
    .filter((f) => f.estado === 'dentro' && f.hora !== null)
    .sort((a, b) => (b.hora ?? '').localeCompare(a.hora ?? ''))
    .slice(0, 5)

  /** Registra a una persona o a varias de la misma invitación, en un solo registro. */
  const registrar = (quienes: readonly FilaDeIngreso[], ahoraMs: number, clave: string) => {
    const primero = quienes[0]
    if (primero === undefined) return
    setEnCurso(clave)
    setAviso(null)
    setNota(null)
    setConfirmar(null)
    const conNombres = quienes.every((q) => q.personaId !== null)
    void checkInByGroupAction({
      eventId,
      eventSlug,
      groupId: primero.invitacionId,
      scanId: crypto.randomUUID(),
      arrivedCount: null,
      scannedAtMs: ahoraMs,
      personIds: conNombres ? quienes.map((q) => q.personaId as string) : null,
    })
      .then((resultado) => {
        // El servidor manda, y a veces dice que no: la invitación se anuló (quizá hace un
        // minuto, desde Invitados) o el grupo no es de este evento. Entonces no se registró
        // nada, y marcarlo dentro aquí sería mentirle a quien está en la puerta.
        if (resultado.kind === 'revoked' || resultado.kind === 'unknown') {
          const quien = quienes.length === 1 ? primero.nombre : (primero.invitacion ?? primero.nombre)
          setAviso(
            resultado.kind === 'revoked'
              ? t(`La invitación de ${quien} se anuló: no se registró el ingreso. Si tiene que entrar, devuélvela en Invitados.`, `${quien}’s invitation was revoked: the check-in was not recorded. If they must come in, restore it under Guests.`)
              : t(`No se pudo registrar a ${quien}: esa invitación ya no está en este evento. Vuelve a cargar la página.`, `${quien} couldn’t be checked in: that invitation is no longer on this event. Reload the page.`),
          )
          return
        }

        // El servidor es quien sabe: si otra puerta ya lo registró, dice `already` y desde cuándo.
        // Registrar de nuevo no duplica —los escaneos se unen—, pero la pantalla no puede fingir
        // que acaba de entrar alguien que ya estaba dentro.
        const yaEstaba = resultado.kind === 'already'
        const hora = horaDe(yaEstaba ? new Date(resultado.arrivedAt) : new Date())
        setEntraron((previo) => ({ ...previo, ...Object.fromEntries(quienes.map((q) => [q.clave, hora])) }))
        setSalieron((previo) => new Set([...previo].filter((c) => !quienes.some((q) => q.clave === c))))
        setPorCodigo(null)
        setCodigo('')
        setNota(yaEstaba ? `${quienes.length === 1 ? primero.nombre : (primero.invitacion ?? primero.nombre)} ya estaba dentro desde las ${hora}.` : null)
        router.refresh()
      })
      .catch(() => setAviso(t(`No se pudo registrar a ${quienes.length === 1 ? primero.nombre : primero.invitacion}. Vuelve a intentarlo.`, `${quienes.length === 1 ? primero.nombre : primero.invitacion} couldn’t be checked in. Try again.`)))
      .finally(() => setEnCurso(null))
  }

  const deshacer = (f: FilaDeIngreso) => {
    setConfirmar(null)
    setEnCurso(f.clave)
    setAviso(null)
    void undoCheckInAction({ eventId, eventSlug, groupId: f.invitacionId, personId: f.personaId })
      .then((r) => {
        if (r.status === 'error') {
          setAviso(t(`No se pudo deshacer el ingreso de ${f.nombre}.`, `${f.nombre}’s check-in couldn’t be undone.`))
          return
        }
        setSalieron((previo) => new Set(previo).add(f.clave))
        setEntraron((previo) => Object.fromEntries(Object.entries(previo).filter(([c]) => c !== f.clave)))
        router.refresh()
      })
      .catch(() => setAviso(t(`No se pudo deshacer el ingreso de ${f.nombre}.`, `${f.nombre}’s check-in couldn’t be undone.`)))
      .finally(() => setEnCurso(null))
  }

  const buscarCodigo = () => {
    setAviso(null)
    const corto = codigo.replace(/[\s-]/g, '').toUpperCase()
    const suyas = vistas.filter((f) => f.codigo === corto)
    if (corto === '' || suyas.length === 0) {
      setPorCodigo(null)
      setAviso(t('Ese código no es de este evento. Revísalo con el invitado.', 'That code isn’t from this event. Check it with the guest.'))
      return
    }
    const invitacionId = suyas[0]!.invitacionId
    setPorCodigo({ invitacionId, marcadas: new Set(suyas.filter((f) => f.invitacionId === invitacionId && f.estado !== 'dentro').map((f) => f.clave)) })
  }

  const abrirEscaner = () => {
    setAviso(null)
    void (async () => {
      try {
        const dispositivos = (await navigator.mediaDevices?.enumerateDevices()) ?? []
        if (dispositivos.some((d) => d.kind === 'videoinput')) {
          router.push(escanerHref)
          return
        }
      } catch {
        // Sin poder enumerar, se trata como sin cámara.
      }
      setAviso(t('Este equipo no tiene cámara. Escribe el código del pase, o abre esta página en el celular de la puerta.', 'This device has no camera. Type the pass code, or open this page on the door phone.'))
    })()
  }

  const encontrada = porCodigo === null ? [] : vistas.filter((f) => f.invitacionId === porCodigo.invitacionId)

  const enBusqueda = (texto: string) => {
    // Un código de pase escrito en el buscador abre su invitación; un nombre, filtra.
    const corto = texto.replace(/[\s-]/g, '').toUpperCase()
    if (corto.length === 5 && vistas.some((f) => f.codigo === corto)) {
      setCodigo(corto)
      const suyas = vistas.filter((f) => f.codigo === corto)
      const invitacionId = suyas[0]!.invitacionId
      setPorCodigo({ invitacionId, marcadas: new Set(suyas.filter((f) => f.invitacionId === invitacionId && f.estado !== 'dentro').map((f) => f.clave)) })
      setBusqueda('')
      // Escrito en el buscador, la invitación se abre en el diálogo del código (E67).
      abrirCodigo()
      return true
    }
    return false
  }

  const pastilla = (texto: string, tono: 'laton' | 'ok' | 'neutro') => (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[12.5px] font-medium whitespace-nowrap ${
        tono === 'ok' ? 'bg-pill-ok text-pill-ok-ink' : tono === 'laton' ? 'bg-pill-laton text-pill-laton-ink' : 'bg-pill-neutra text-pill-neutra-ink'
      }`}
    >
      {texto}
    </span>
  )

  return (
    // `minmax(0,1fr)` también en el celular: sin columnas declaradas la rejilla crecía con el campo del código.
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_300px]">
      <aside className="flex flex-col gap-5 max-[1099px]:contents min-[1100px]:sticky min-[1100px]:top-6 min-[1100px]:order-2">
        <section aria-label={t('Cómo va el ingreso', 'Check-in progress')} className="flex flex-col gap-5 rounded-[16px] border border-line-panel bg-tarjeta p-6 max-[1099px]:order-1 max-[1099px]:border-none max-[1099px]:bg-transparent max-[1099px]:p-0">
          {/* En el celular y la tablet, una línea con su barra y los dos botones (M16). */}
          <div className="flex flex-col gap-3 min-[1100px]:hidden">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-[44px] leading-none font-medium [font-variant-numeric:lining-nums]">{dentro}</span>
              <span className="text-[15px] text-ink-mute">{t(`de ${esperados} ${esperados === 1 ? 'persona' : 'personas'} dentro`, `of ${esperados} ${esperados === 1 ? 'person' : 'people'} inside`)}</span>
            </p>
            <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-line-panel">
              <div className="h-full rounded-full bg-shell-deep" style={{ width: `${Math.round(avance * 100)}%` }} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-5 max-[1099px]:hidden">
            <div
              aria-hidden
              className="grid size-[150px] place-items-center rounded-full"
              style={{ background: `conic-gradient(var(--color-shell-deep) ${Math.round(avance * 360)}deg, var(--color-line-panel) 0deg)` }}
            >
              <span className="grid size-[128px] place-items-center rounded-full bg-tarjeta text-center">
                <span className="flex flex-col">
                  <span className="font-display text-[40px] leading-none font-medium [font-variant-numeric:lining-nums]">{dentro}</span>
                  <span className="mt-1 text-[13px] text-ink-mute">{t(`de ${esperados} dentro`, `of ${esperados} inside`)}</span>
                </span>
              </span>
            </div>
            <span className="sr-only">{t(`${dentro} de ${esperados} personas dentro`, `${dentro} of ${esperados} people inside`)}</span>
            <dl className="grid w-full grid-cols-3 text-center">
              {(
                [
                  [t('Dentro', 'Inside'), cuantos('dentro')],
                  [t('Por llegar', 'Expected'), cuantos('por_llegar')],
                  [t('No vienen', 'Not coming'), cuantos('no_viene')],
                ] as const
              ).map(([k, v]) => (
                <div className="flex flex-col-reverse gap-0.5" key={k}>
                  <dt className="text-[13px] text-ink-mute">{k}</dt>
                  <dd className="font-display text-[24px] leading-none font-medium [font-variant-numeric:lining-nums]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid grid-cols-2 gap-2.5 min-[1100px]:grid-cols-1">
            <button
              className="flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-[12px] bg-shell-deep px-5 text-[15px] font-medium text-shell-ink transition-colors hover:bg-shell"
              onClick={abrirEscaner}
              type="button"
            >
              <ScanIcon className="size-5" />
              {t('Escanear QR', 'Scan QR')}
            </button>
            <button
              aria-haspopup="dialog"
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-[12px] border border-line-panel-strong bg-bg-raised px-5 text-[15px] font-medium text-ink hover:border-gold"
              onClick={abrirCodigo}
              type="button"
            >
              {t('Código del pase', 'Pass code')}
            </button>
          </div>
          {/* El último recurso, discreto (pedido del usuario): quien llega sin estar en la lista (E68). */}
          <button className="min-h-11 w-full cursor-pointer text-center text-[14px] font-medium text-gold-deep hover:underline" onClick={() => dialogoSinPase.current?.showModal()} type="button">
            {t('Llegó alguien sin pase', 'Someone arrived without a pass')}
          </button>
          <SinPase dialogo={dialogoSinPase} eventId={eventId} eventSlug={eventSlug} invitaciones={invitaciones} mesas={mesas} />
        </section>

        <section aria-label={t('Últimas llegadas', 'Latest arrivals')} className="hidden flex-col gap-2 rounded-[16px] border border-line-panel bg-tarjeta p-5 min-[1100px]:flex">
          <h2 className="border-b border-line-panel pb-2.5 text-[15px] font-medium">{t('Últimas llegadas', 'Latest arrivals')}</h2>
          {recientes.length === 0 ? (
            <p className="text-[13.5px] text-ink-mute">{t('Todavía no entró nadie.', 'No one has checked in yet.')}</p>
          ) : (
            <ul className="flex flex-col">
              {recientes.map((f) => (
                <li className="flex items-center justify-between gap-3 border-b border-line-panel py-2 text-[14px] last:border-none" key={f.clave}>
                  <span className="min-w-0 truncate">{f.nombre}</span>
                  <span className="shrink-0 text-ink-mute [font-variant-numeric:tabular-nums]">{f.hora}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {recepcion === null ? null : (
          <section aria-label={t('Recepción', 'Reception')} className="flex flex-col gap-2 rounded-[16px] border border-line-panel bg-tarjeta p-5 max-[1099px]:order-4">
            <h2 className="border-b border-line-panel pb-2.5 text-[15px] font-medium">{t('Recepción', 'Reception')}</h2>
            {recepcion.personas.length === 0 ? (
              <p className="text-[13.5px] leading-[1.6] text-ink-mute">
                {t('Solo tú registras ingresos. Suma a quien reciba en la puerta: le llega un enlace y un PIN para escanear desde su celular, sin crear cuenta.', 'Only you record check-ins. Add whoever greets at the door: they get a link and a PIN to scan from their phone, without creating an account.')}
              </p>
            ) : (
              <ul className="flex flex-col">
                {recepcion.personas.map((p) => (
                  <li className="flex items-center gap-3 border-b border-line-panel py-2.5 last:border-none" key={p.id}>
                    <Iniciales chico nombre={p.nombre} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14.5px] font-medium">{p.nombre}</span>
                      <span className="truncate text-[13px] text-ink-mute">{[p.puerta, t(`${p.registradas} ${p.registradas === 1 ? 'ingreso' : 'ingresos'}`, `${p.registradas} ${p.registradas === 1 ? 'check-in' : 'check-ins'}`)].filter(Boolean).join(', ')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link className="inline-flex min-h-11 items-center text-[14px] font-medium text-gold-deep no-underline hover:underline" href={recepcion.gestionarHref}>
              {recepcion.personas.length === 0 ? t('Sumar personal de recepción', 'Add reception staff') : t('Sumar o quitar personal', 'Add or remove staff')}
            </Link>
          </section>
        )}
      </aside>

      <div className="flex min-w-0 flex-col gap-4 max-[1099px]:contents min-[1100px]:order-1">
        <section aria-label={t('Registrar un ingreso', 'Record a check-in')} className="flex flex-col gap-3 max-[1099px]:order-2">
          <form
            className="flex"
            onSubmit={(e) => {
              e.preventDefault()
              enBusqueda(busqueda)
            }}
          >
            <SearchField className="w-full" label={t('Buscar invitado', 'Search guest')} onChange={(e) => setBusqueda(e.target.value)} placeholder={t('Buscar por nombre o código del pase', 'Search by name or pass code')} value={busqueda} />
          </form>

          {/* «Entrar con el código» (E67): cuando el QR no se puede escanear. */}
          <dialog
            aria-labelledby="codigo-titulo"
            className="m-auto max-h-[92dvh] w-[min(560px,94vw)] max-w-none overflow-y-auto rounded-[20px] border border-line-panel bg-bg p-7 text-ink shadow-float backdrop:bg-shell-deep/50 max-[767px]:mx-0 max-[767px]:mt-auto max-[767px]:mb-0 max-[767px]:w-full max-[767px]:rounded-b-none max-[767px]:px-5 max-[767px]:pt-3 max-[767px]:pb-[max(20px,env(safe-area-inset-bottom))]"
            onClose={() => {
              setPorCodigo(null)
              setCodigo('')
              setCodigoAbierto(false)
            }}
            ref={dialogoCodigo}
          >
            <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line-panel-strong min-[768px]:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-[30px] leading-tight font-medium max-[767px]:text-[26px]" id="codigo-titulo">
                  {t('Entrar con el código', 'Check in with the code')}
                </h2>
                <p className="text-[15px] text-ink-mute">{t('Cuando el QR no se puede escanear.', 'When the QR can’t be scanned.')}</p>
              </div>
              <button aria-label={t('Cerrar', 'Close')} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised text-ink transition-colors hover:border-gold" onClick={() => dialogoCodigo.current?.close()} type="button">
                <CloseIcon className="size-4" />
              </button>
            </div>
            <form
              className="mt-5 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                buscarCodigo()
              }}
            >
              <label className="text-[14px] font-medium" htmlFor="codigo-del-pase">
                {t('Código del pase', 'Pass code')}
              </label>
              <input
                autoCapitalize="characters"
                autoComplete="off"
                className="min-h-12 min-w-0 rounded-[10px] border border-line-panel-strong bg-bg-raised px-4 font-codigo text-[20px] tracking-[0.3em] text-ink uppercase outline-none focus-visible:border-gold"
                id="codigo-del-pase"
                maxLength={8}
                onChange={(e) => {
                  setCodigo(e.target.value)
                  // Cinco caracteres ya son un código: se busca solo, sin pulsar nada.
                  if (e.target.value.replace(/[\s-]/g, '').length === 5) enBusqueda(e.target.value)
                }}
                value={codigo}
              />
              <span className="text-[13px] text-ink-mute">{t('Está debajo del QR, 5 letras y números', 'It’s below the QR, 5 letters and numbers')}</span>
            </form>
            {aviso === null || porCodigo !== null ? null : (
              <p className="mt-3 rounded-[12px] bg-pill-no px-4 py-3 text-[14px] text-pill-no-ink" role="alert">
                {aviso}
              </p>
            )}
          {porCodigo === null || encontrada.length === 0 ? null : (
              <div className="mt-4 flex flex-col gap-3 rounded-[14px] border border-gold/60 bg-bg-raised p-4.5" role="status">
                <p className="m-0 flex items-baseline justify-between gap-3">
                  <span className="text-[16px] font-medium">{encontrada[0]!.invitacion ?? encontrada[0]!.nombre}</span>
                  <span className="text-[14px] text-ink-mute">{encontrada[0]!.mesa ?? t('Sin mesa', 'No table')}</span>
                </p>
                <ul className="flex flex-col">
                  {encontrada.map((f) =>
                    f.estado === 'dentro' ? (
                      <li className="flex min-h-11 items-center justify-between text-[15px]" key={f.clave}>
                        <span className="text-ink-mute">{f.nombre}</span>
                        <span className="text-[13px] text-ok-deep">{f.hora === null ? t('Ya entró', 'Already in') : t(`Entró ${f.hora}`, `In at ${f.hora}`)}</span>
                      </li>
                    ) : (
                      <li key={f.clave}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                          <input
                            checked={porCodigo.marcadas.has(f.clave)}
                            className="size-5 accent-[var(--color-shell-deep)]"
                            onChange={(e) => {
                              // Se lee ya: dentro del actualizador React ya devolvió la casilla a su valor controlado.
                              const marcada = e.target.checked
                              setPorCodigo((previo) => {
                                if (previo === null) return previo
                                const marcadas = new Set(previo.marcadas)
                                if (marcada) marcadas.add(f.clave)
                                else marcadas.delete(f.clave)
                                return { ...previo, marcadas }
                              })
                            }}
                            type="checkbox"
                          />
                          <span className="flex-1">{f.nombre}</span>
                          {f.vip ? <span className="text-[13px] text-ink-mute">VIP</span> : null}
                        </label>
                      </li>
                    ),
                  )}
                </ul>
                {encontrada.every((f) => f.estado === 'dentro') ? (
                  <p className="m-0 text-[14px] text-ink-mute">{t('Ya entraron todos los de esta invitación.', 'Everyone on this invitation is already in.')}</p>
                ) : (
                  <div className="flex justify-end gap-2">
                    <button className={botonClases('default')} onClick={() => dialogoCodigo.current?.close()} type="button">
                      {t('Cancelar', 'Cancel')}
                    </button>
                    <button
                      aria-label={t('Registrar ingreso', 'Check in')}
                      className={botonClases('primary')}
                      disabled={enCurso !== null || porCodigo.marcadas.size === 0}
                      onClick={(e) => {
                        registrar(encontrada.filter((f) => porCodigo.marcadas.has(f.clave)), e.timeStamp + performance.timeOrigin, 'codigo')
                        dialogoCodigo.current?.close()
                      }}
                      type="button"
                    >
                      {enCurso === 'codigo' ? t('Registrando…', 'Checking in…') : porCodigo.marcadas.size > 1 ? t(`Registrar a los ${porCodigo.marcadas.size}`, `Check in all ${porCodigo.marcadas.size}`) : t('Registrar ingreso', 'Check in')}
                    </button>
                  </div>
                )}
              </div>
            )}

          </dialog>

          {/* Con el diálogo del código abierto, el aviso sale dentro de él. */}
          {aviso === null || codigoAbierto ? null : (
            <p className="m-0 rounded-[12px] bg-pill-no px-4 py-3 text-[14px] text-pill-no-ink" role="alert">
              {aviso}
            </p>
          )}
          {nota === null ? null : (
            <p className="m-0 rounded-[12px] bg-pill-ok px-4 py-3 text-[14px] text-pill-ok-ink" role="status">
              {nota}
            </p>
          )}
        </section>

        <section aria-label={t('Invitados', 'Guests')} className="flex flex-col gap-3 max-[1099px]:order-3">
          {/* En el celular las cuatro no caben en una fila: bajan a la siguiente («Todos» quedaba fuera de la pantalla). */}
          <div className="flex gap-6 border-b border-line-panel max-[767px]:flex-wrap max-[767px]:gap-2 max-[767px]:border-none" role="tablist">
            {filtros(t).map((f) => {
              const activa = buscado === '' && filtro === f.clave
              return (
                <button
                  aria-selected={activa}
                  className={`min-h-11 cursor-pointer text-[15px] whitespace-nowrap transition-colors max-[767px]:rounded-full max-[767px]:border max-[767px]:px-4 max-[767px]:font-medium min-[768px]:-mb-px min-[768px]:border-b-2 ${
                    activa
                      ? 'font-medium text-ink max-[767px]:border-shell-deep max-[767px]:bg-shell-deep max-[767px]:text-shell-ink min-[768px]:border-shell-deep'
                      : 'text-ink-mute hover:text-ink max-[767px]:border-line-panel-strong max-[767px]:bg-bg-raised max-[767px]:text-ink min-[768px]:border-transparent'
                  }`}
                  key={f.clave}
                  onClick={() => {
                    setFiltro(f.clave)
                    setBusqueda('')
                  }}
                  role="tab"
                  type="button"
                >
                  {f.texto} {cuantos(f.clave)}
                </button>
              )
            })}
          </div>

          {porInvitacion.length === 0 ? (
            <EmptyState
              compact
              {...(filas.length === 0 ? { icon: <UsersIcon />, description: t('Cuando cargues invitados, aquí se registra su llegada.', 'Once you add guests, their arrival is recorded here.') } : filtro === 'por_llegar' && buscado === '' ? { icon: <CheckIcon /> } : {})}
              title={filas.length === 0 ? t('Aún no hay invitados', 'No guests yet') : buscado !== '' ? t('Nadie con ese nombre', 'No one with that name') : filtro === 'por_llegar' ? t('Llegaron todos los que se esperaban', 'Everyone expected has arrived') : t('Nadie en esta lista', 'No one on this list')}
            />
          ) : (
            <div aria-label={t('Ingresos', 'Check-ins')} role="table">
              <div className={`${COLUMNAS} border-b border-line-panel px-3 pb-2.5 text-[13px] font-medium text-ink-mute max-[859px]:hidden`} role="row">
                <span role="columnheader">{t('Invitado', 'Guest')}</span>
                <span role="columnheader">{t('Invitación', 'Invitation')}</span>
                <span role="columnheader">{t('Mesa', 'Table')}</span>
                <span role="columnheader">{t('Estado', 'Status')}</span>
                <span className="text-right" role="columnheader">
                  <span className="sr-only">{t('Acción', 'Action')}</span>
                </span>
              </div>
              {porInvitacion.map((bloque) => {
                const todas = vistas.filter((v) => v.invitacionId === bloque.id)
                const pendientes = todas.filter((v) => v.estado === 'por_llegar')
                const familia = todas.length > 1
                // Plegada, una familia se lee como una línea; buscando se abre sola, que es cuando se busca a alguien.
                const abierta = !familia || abiertas.has(bloque.id) || buscado !== ''
                const dentroN = todas.filter((v) => v.estado === 'dentro').length
                const nombreDeBloque = bloque.filas[0]?.invitacion ?? bloque.filas[0]?.nombre ?? ''
                const mesa = bloque.filas[0]?.mesa
                return (
                  <div key={bloque.id} role="rowgroup">
                    {familia ? (
                      <div className={`${COLUMNAS} border-b border-line-panel px-3 py-3.5 ${pendientes.length > 0 && dentroN > 0 ? 'bg-pill-pending/60' : ''}`} role="row">
                        <span className="flex min-w-0 min-[860px]:col-span-4" role="cell">
                          <button
                            aria-expanded={abierta}
                            className="flex min-w-0 cursor-pointer items-baseline gap-2 text-left max-[859px]:min-h-11 max-[859px]:flex-col max-[859px]:gap-0.5"
                            onClick={() =>
                              setAbiertas((previo) => {
                                const siguiente = new Set(previo)
                                if (siguiente.has(bloque.id)) siguiente.delete(bloque.id)
                                else siguiente.add(bloque.id)
                                return siguiente
                              })
                            }
                            type="button"
                          >
                            <span className="text-[15px] font-medium text-ink max-[859px]:text-[17px]">{nombreDeBloque}</span>
                            <span className={`text-[14px] ${dentroN > 0 && pendientes.length > 0 ? 'text-gold-deep' : 'text-ink-mute'}`}>
                              {[`${todas.length} personas`, mesa ? `${mesa.toLowerCase()}` : null].filter(Boolean).join(', ')}
                              {dentroN === 0 ? '' : dentroN === todas.length ? '. Dentro' : `, llegaron ${dentroN}`}
                            </span>
                          </button>
                        </span>
                        <span className="flex justify-end" role="cell">
                          {pendientes.length > 1 ? (
                            <button
                              aria-label={t(`Registrar a los ${pendientes.length} de ${nombreDeBloque}`, `Check in all ${pendientes.length} of ${nombreDeBloque}`)}
                              className="min-h-11 cursor-pointer rounded-[10px] bg-shell-deep px-4 text-[14px] font-medium whitespace-nowrap text-shell-ink disabled:opacity-50 min-[860px]:min-h-10"
                              disabled={enCurso !== null}
                              onClick={() => registrar(pendientes, Date.now(), `todos:${bloque.id}`)}
                              type="button"
                            >
                              {enCurso === `todos:${bloque.id}` ? t('Registrando…', 'Checking in…') : t(`Registrar a los ${pendientes.length}`, `Check in all ${pendientes.length}`)}
                            </button>
                          ) : null}
                        </span>
                      </div>
                    ) : null}
                    {!abierta
                      ? null
                      : bloque.filas.map((f) => (
                          <div aria-label={f.nombre} className={`${COLUMNAS} border-b border-line-panel px-3 py-3.5 ${familia ? 'min-[860px]:pl-8' : ''}`} key={f.clave} role="row">
                            <span className="flex min-w-0 flex-col" role="cell">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="text-[15px] font-medium text-ink max-[859px]:text-[17px] min-[860px]:truncate">{f.nombre}</span>
                                {f.vip ? <span className="shrink-0 rounded-full bg-pill-laton px-2 py-0.5 text-[12px] font-medium text-pill-laton-ink">VIP</span> : null}
                              </span>
                              <span className="text-[14px] text-ink-mute min-[860px]:hidden">
                                {/* La invitación solo si dice algo más que el nombre («Carlos / Carlos» se repetía). */}
                                {[familia || f.invitacion === f.nombre ? null : (f.invitacion ?? null), f.mesa ? f.mesa.toLowerCase() : null].filter(Boolean).join(', ')}
                              </span>
                            </span>
                            <span className="min-w-0 truncate text-[14.5px] text-ink-mute max-[859px]:hidden" role="cell">
                              {familia ? '' : f.invitacion === null || f.invitacion === f.nombre ? t('Invitación propia', 'Own invitation') : f.invitacion}
                            </span>
                            <span className="text-[14.5px] max-[859px]:hidden" role="cell">
                              {f.mesa ? f.mesa.replace(/^mesa\s*0*/i, '') : '—'}
                            </span>
                            <span className="max-[859px]:hidden" role="cell">
                              {f.estado === 'dentro' ? pastilla(f.hora === null ? t('Dentro', 'Inside') : t(`Dentro, ${f.hora}`, `Inside, ${f.hora}`), 'ok') : f.estado === 'no_viene' ? pastilla(t('No viene', 'Not coming'), 'neutro') : pastilla(t('Por llegar', 'Expected'), 'laton')}
                            </span>
                            <span className="flex justify-end" role="cell">
                              {confirmar === f.clave ? (
                                <span className="flex items-center gap-1.5" role="alert">
                                  <button className="min-h-10 cursor-pointer rounded-[10px] bg-danger px-3 text-[13px] text-white" onClick={() => deshacer(f)} type="button">
                                    {t('Deshacer', 'Undo')}
                                  </button>
                                  <button className="min-h-10 cursor-pointer px-2 text-[13px] text-ink-mute" onClick={() => setConfirmar(null)} type="button">
                                    {t('No', 'No')}
                                  </button>
                                </span>
                              ) : f.estado === 'dentro' ? (
                                <>
                                  <span className="text-[14px] text-ok-deep min-[860px]:hidden">{f.hora === null ? t('Dentro', 'Inside') : t(`Dentro ${f.hora}`, `Inside ${f.hora}`)}</span>
                                  <button
                                    aria-label={t(`Deshacer el ingreso de ${f.nombre}`, `Undo ${f.nombre}’s check-in`)}
                                    className="cursor-pointer text-[14px] font-medium text-gold-deep hover:underline disabled:opacity-50 max-[859px]:ml-3 max-[859px]:min-h-11"
                                    disabled={enCurso !== null}
                                    onClick={() => setConfirmar(f.clave)}
                                    type="button"
                                  >
                                    {enCurso === f.clave ? t('Deshaciendo…', 'Undoing…') : t('Deshacer', 'Undo')}
                                  </button>
                                </>
                              ) : f.estado === 'no_viene' ? null : (
                                <button
                                  aria-label={t(`Registrar a ${f.nombre}`, `Check in ${f.nombre}`)}
                                  className="min-h-11 cursor-pointer rounded-[10px] border border-line-panel-strong bg-bg-raised px-4 text-[14px] font-medium text-ink hover:border-gold disabled:opacity-50 min-[860px]:min-h-10"
                                  disabled={enCurso !== null}
                                  onClick={() => registrar([f], Date.now(), f.clave)}
                                  type="button"
                                >
                                  {enCurso === f.clave ? t('Registrando…', 'Checking in…') : t('Registrar', 'Check in')}
                                </button>
                              )}
                            </span>
                          </div>
                        ))}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/**
 * **Llegó alguien sin pase** (maqueta E68): nombre y con quién viene. Se suma como acompañante a esa invitación y
 * entra ya; se sienta en su mesa. Primero se avisa de buscarlo por nombre: quizá sí está, en otra invitación.
 */
function SinPase({
  dialogo,
  eventId,
  eventSlug,
  invitaciones,
  mesas,
}: {
  mesas: readonly MesaDelSalon[]
  dialogo: RefObject<HTMLDialogElement | null>
  eventId: string
  eventSlug: string
  invitaciones: readonly { id: string; nombre: string; mesa: string | null }[]
}) {
  const t = useT()
  const [estado, registrar, registrando] = useActionState<SinPaseState, FormData>(sinCaerse(registrarSinPaseAction), { status: 'idle' })
  const [con, setCon] = useState(invitaciones[0]?.id ?? '')
  const mesaDeSuInvitacion = mesas.find((m) => m.invitaciones.includes(con))?.id ?? ''
  // La mesa elegida a mano; sin elegir, la de su invitación.
  const [mesaElegida, setMesaElegida] = useState<string | null>(null)
  const mesa = mesaElegida ?? mesaDeSuInvitacion
  const cerrar = () => dialogo.current?.close()
  useEffect(() => {
    if (estado.status === 'success') dialogo.current?.close()
  }, [estado, dialogo])

  return (
    <>
      {estado.status === 'success' ? (
        <p className="m-0 rounded-[12px] bg-pill-ok px-4 py-3 text-[14px] text-pill-ok-ink" role="status">
          {estado.message}
        </p>
      ) : null}
      <dialog
        aria-labelledby="sin-pase-titulo"
        className="m-auto max-h-[92dvh] w-[min(560px,94vw)] max-w-none overflow-y-auto rounded-[20px] border border-line-panel bg-bg p-7 text-left text-ink shadow-float backdrop:bg-shell-deep/50 max-[767px]:mx-0 max-[767px]:mt-auto max-[767px]:mb-0 max-[767px]:w-full max-[767px]:rounded-b-none max-[767px]:px-5 max-[767px]:pt-3 max-[767px]:pb-[max(20px,env(safe-area-inset-bottom))]"
        ref={dialogo}
      >
        <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line-panel-strong min-[768px]:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[30px] leading-tight font-medium max-[767px]:text-[26px]" id="sin-pase-titulo">
              {t('Llegó alguien sin pase', 'Someone arrived without a pass')}
            </h2>
            <p className="text-[15px] text-ink-mute">{t('Lo registramos como acompañante extra. El catering lo cuenta.', 'We record them as an extra companion. Catering counts them.')}</p>
          </div>
          <button aria-label={t('Cerrar', 'Close')} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised hover:border-gold" onClick={cerrar} type="button">
            <CloseIcon className="size-4" />
          </button>
        </div>
        <p className="mt-5 rounded-[12px] bg-pill-pending px-4 py-3.5 text-[14.5px] text-pill-pending-ink">{t('Primero búscalo por nombre: quizá está en otra invitación.', 'Search for them by name first: they may be on another invitation.')}</p>
        <form action={registrar} className="mt-5 flex flex-col gap-4">
          <input name="eventId" type="hidden" value={eventId} />
          <input name="eventSlug" type="hidden" value={eventSlug} />
          <label className="flex flex-col gap-2" htmlFor="sin-pase-nombre">
            <span className={LABEL_CLASS}>{t('Nombre', 'Name')}</span>
            <input autoComplete="off" className={FIELD_CLASS} id="sin-pase-nombre" maxLength={160} name="nombre" required />
          </label>
          <div className="grid gap-4 min-[480px]:grid-cols-2">
            <label className="flex flex-col gap-2" htmlFor="sin-pase-con">
              <span className={LABEL_CLASS}>{t('Viene con', 'Comes with')}</span>
              <select
                className={FIELD_CLASS}
                id="sin-pase-con"
                name="groupId"
                onChange={(e) => {
                  setCon(e.target.value)
                  setMesaElegida(null)
                }}
                required
                value={con}
              >
                {invitaciones.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre}
                  </option>
                ))}
              </select>
            </label>
            {mesas.length === 0 ? null : (
              <label className="flex flex-col gap-2" htmlFor="sin-pase-mesa">
                <span className={LABEL_CLASS}>{t('Mesa', 'Table')}</span>
                {/* Su mesa (entra con su invitación) u otra (se le abre una invitación propia en esa mesa). */}
                <select className={FIELD_CLASS} id="sin-pase-mesa" name="tableId" onChange={(e) => setMesaElegida(e.target.value)} value={mesa}>
                  {mesaDeSuInvitacion === '' ? <option value="">{t('Sin mesa', 'No table')}</option> : null}
                  {mesas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.libres === 1 ? t('1 libre', '1 free') : t(`${m.libres} libres`, `${m.libres} free`)})
                    </option>
                  ))}
                </select>
                <input name="mesaDeSuInvitacion" type="hidden" value={mesaDeSuInvitacion} />
              </label>
            )}
          </div>
          {estado.status === 'error' ? (
            <p className="text-[13.5px] text-danger" role="alert">
              {estado.message}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2.5 max-[767px]:flex-col-reverse max-[767px]:items-stretch">
            <button className={botonClases('default')} onClick={cerrar} type="button">
              {t('Cancelar', 'Cancel')}
            </button>
            <SubmitButton pending={registrando} pendingLabel={t('Registrando…', 'Checking in…')} variant="primary">
              {t('Registrar la llegada', 'Record the arrival')}
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  )
}
