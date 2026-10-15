'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
import { removeDocumentAction, uploadDocumentAction } from '@/app/_acciones/planner/dia-actions'
import { FileIcon, TrashIcon, UploadIcon } from '@/shared/design/ui/icons'
import { botonClases, FIELD_CLASS, Field, IconButton, PanelAlert, Pill } from '@/shared/design/ui/panel/PanelKit'
import { NOMBRE_DE_DOCUMENTO, type TipoDeDocumento } from '../domain/dia-d'
import type { Evento } from './Accion'
import { useT } from '@/shared/i18n/idioma-navegador'
import { traducir } from '@/shared/i18n/en-ingles'

export type DocumentoVista = {
  readonly id: string
  readonly kind: TipoDeDocumento
  readonly topic: string | null
  readonly originalName: string
  readonly peso: string
  readonly vendorId: string | null
  /** Si es una imagen: se enseña en miniatura en vez de como un nombre de archivo. */
  readonly esImagen: boolean
  readonly href: string
}

type Opcion = { readonly id: string; readonly nombre: string }

/** Los temas de la inspiración: lo que una pareja o una quinceañera suele juntar en fotos. */
const TEMAS = ['Vestido', 'Decoración', 'Flores', 'Torta', 'Peinado y maquillaje', 'Otros'] as const
const TIPOS_DE_ARCHIVO: readonly TipoDeDocumento[] = ['contrato', 'cotizacion', 'factura']

/**
 * Contratos e inspiración, sin formularios.
 *
 * Antes había que elegir «Es / Tema / Proveedor / Partida» en cuatro desplegables antes de
 * subir nada. Ahora cada proveedor tiene su tarjeta: se suelta el archivo ahí —o se toca para
 * elegirlo— y queda enlazado a él. La inspiración es un tablero de fotos por tema.
 */
export function DocumentsBoard({ evento, documentos, proveedores }: { evento: Evento; documentos: readonly DocumentoVista[]; proveedores: readonly Opcion[] }) {
  const t = useT()
  const [pestana, setPestana] = useState<'contratos' | 'inspiracion'>('contratos')
  const referencias = documentos.filter((d) => d.kind === 'referencia')
  const archivos = documentos.filter((d) => d.kind !== 'referencia')

  return (
    <div className="flex flex-col gap-5">
      <div aria-label={t('Qué ver', 'What to view')} className="flex gap-6 border-b border-line-panel" role="tablist">
        {(
          [
            ['contratos', t('Contratos y facturas', 'Contracts and invoices'), archivos.length],
            ['inspiracion', t('Inspiración', 'Inspiration'), referencias.length],
          ] as const
        ).map(([clave, texto, cuenta]) => (
          <button
            aria-selected={pestana === clave}
            className={`-mb-px min-h-11 cursor-pointer border-b-2 text-[15px] transition-colors ${pestana === clave ? 'border-shell-deep font-medium text-ink' : 'border-transparent text-ink-mute hover:text-ink'}`}
            key={clave}
            onClick={() => setPestana(clave)}
            role="tab"
            type="button"
          >
            {texto}
            <span aria-hidden className="ml-1.5 text-ink-mute">
              {cuenta}
            </span>
          </button>
        ))}
      </div>

      {pestana === 'contratos' ? (
        <div className="flex flex-col gap-8">
          <SubirContrato evento={evento} proveedores={proveedores} />
          <section aria-labelledby="tus-documentos" className="flex flex-col gap-2">
            <h2 className="font-display text-[24px] font-medium" id="tus-documentos">
              {t('Tus documentos', 'Your documents')}
            </h2>
            {archivos.length === 0 ? (
              <p className="text-[14px] leading-[1.7] text-ink-mute">
                {t('Todavía no subiste nada. Aquí se guardan los contratos, las cotizaciones y las facturas de tu fiesta: privados, solo para ti y tu equipo, y a mano el día que un proveedor diga otra cosa.', 'You haven’t uploaded anything yet. Your party’s contracts, quotes and invoices are kept here: private, only for you and your team, and handy the day a vendor says otherwise.')}
              </p>
            ) : (
              <ListaDeArchivos documentos={archivos} evento={evento} proveedores={proveedores} />
            )}
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {TEMAS.map((tema) => {
            const fotos = referencias.filter((d) => (d.topic ?? 'Otros') === tema || (tema === 'Otros' && !TEMAS.includes(d.topic as (typeof TEMAS)[number])))
            return (
              <Tarjeta key={tema} titulo={traducir(tema, t)}>
                {fotos.length === 0 ? null : (
                  <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
                    {fotos.map((f) => (
                      <li className="group relative aspect-square overflow-hidden rounded-[12px] border border-line-panel bg-bg-top" key={f.id}>
                        {f.esImagen ? (
                          // Documento privado servido tras la sesión, fuera del optimizador de imágenes.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={f.originalName} className="size-full object-cover" loading="lazy" src={f.href} />
                        ) : (
                          <a className="grid size-full place-items-center p-2 text-center text-[11px] text-ink-soft underline" href={f.href}>
                            {f.originalName}
                          </a>
                        )}
                        <Quitar evento={evento} id={f.id} nombre={f.originalName} />
                      </li>
                    ))}
                  </ul>
                )}
                <ZonaDeSubida accept="image/jpeg,image/png,image/webp" campos={{ topic: tema }} evento={evento} texto={t(`Arrastra aquí fotos de ${tema.toLowerCase()}`, `Drag photos of ${traducir(tema, t).toLowerCase()} here`)} />
              </Tarjeta>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-[16px] border border-line-panel bg-tarjeta p-5">
      <h3 className="m-0 font-display text-[20px] font-medium text-ink" id={id}>
        {titulo}
      </h3>
      {children}
    </section>
  )
}

const COLUMNAS = 'min-[768px]:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,0.8fr)_auto]'

/** La tabla de la maqueta (E27): archivo, tipo, proveedor, peso y «Descargar». */
function ListaDeArchivos({ documentos, evento, proveedores }: { documentos: readonly DocumentoVista[]; evento: Evento; proveedores: readonly Opcion[] }) {
  const t = useT()
  return (
    <div>
      <div className={`hidden gap-4 border-b border-line-panel-strong px-2 pb-2.5 text-[13px] font-medium text-ink-mute min-[768px]:grid ${COLUMNAS}`}>
        <span>{t('Archivo', 'File')}</span>
        <span>{t('Tipo', 'Type')}</span>
        <span>{t('Proveedor', 'Vendor')}</span>
        <span>{t('Peso', 'Size')}</span>
        <span className="sr-only">{t('Acciones', 'Actions')}</span>
      </div>
      <ul>
        {documentos.map((d) => {
          const proveedor = proveedores.find((p) => p.id === d.vendorId)?.nombre
          return (
            <li className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-line-panel px-2 py-3 text-[14.5px] max-[767px]:px-0 ${COLUMNAS}`} key={d.id}>
              <span className="flex min-w-0 items-center gap-3">
                <FileIcon className="size-4 shrink-0 text-gold-deep" />
                <a className="truncate font-medium text-ink no-underline hover:underline" download href={d.href}>
                  {d.originalName}
                </a>
              </span>
              <span className="max-[767px]:col-start-1 max-[767px]:row-start-2">
                <Pill tone="neutro">{traducir(NOMBRE_DE_DOCUMENTO[d.kind], t)}</Pill>
                <span className="ml-2 text-[13px] text-ink-mute min-[768px]:hidden">{[proveedor, d.peso].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="truncate max-[767px]:hidden">{proveedor ?? <span className="text-ink-mute">—</span>}</span>
              <span className="text-ink-mute [font-variant-numeric:tabular-nums] max-[767px]:hidden">{d.peso}</span>
              <span className="flex items-center gap-1.5 justify-self-end max-[767px]:col-start-2 max-[767px]:row-span-2 max-[767px]:row-start-1">
                <a className={botonClases('default')} download href={d.href}>
                  {t('Descargar', 'Download')}
                </a>
                <Quitar enLinea evento={evento} id={d.id} nombre={d.originalName} />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Sube los archivos uno por uno con los datos que se le pasen; dice el primero que falle. */
function useSubida(evento: Evento) {
  const t = useT()
  const router = useRouter()
  const [subiendo, empezar] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const subir = (archivos: readonly File[], campos: Record<string, string>) => {
    if (archivos.length === 0) return
    setError(null)
    empezar(async () => {
      for (const archivo of archivos) {
        const fd = new FormData()
        fd.set('eventId', evento.eventId)
        fd.set('eventSlug', evento.eventSlug)
        for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor)
        fd.set('file', archivo)
        const r = (await uploadDocumentAction({ status: 'idle' }, fd)) as { status: string; message?: string }
        if (r.status === 'error') {
          setError(`${archivo.name}: ${r.message ?? t('no se pudo subir.', 'it couldn’t be uploaded.')}`)
          break
        }
      }
      router.refresh()
    })
  }
  return { subir, subiendo, error }
}

/** La tarjeta de subida (E27): soltar el archivo encima o elegirlo, con qué es y de qué proveedor a la vista. */
function SubirContrato({ evento, proveedores }: { evento: Evento; proveedores: readonly Opcion[] }) {
  const t = useT()
  const id = useId()
  const [tipo, setTipo] = useState<TipoDeDocumento>('contrato')
  const [proveedor, setProveedor] = useState('')
  const [encima, setEncima] = useState(false)
  const { subir, subiendo, error } = useSubida(evento)
  const campos = { kind: tipo, vendorId: proveedor }
  return (
    <section
      aria-labelledby={`${id}-t`}
      className={`flex flex-col gap-3 rounded-[16px] border border-dashed bg-tarjeta px-6 py-5 transition-colors ${encima ? 'border-gold bg-bg-top' : 'border-gold/60'}`}
      onDragLeave={() => setEncima(false)}
      onDragOver={(e) => {
        e.preventDefault()
        setEncima(true)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setEncima(false)
        subir([...(e.dataTransfer?.files ?? [])], campos)
      }}
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex min-w-[240px] flex-1 items-center gap-4 self-center">
          <UploadIcon className="size-6 shrink-0 text-gold-deep" />
          <div>
            <h2 className="font-display text-[22px] leading-tight font-medium" id={`${id}-t`}>
              {t('Subir un documento', 'Upload a document')}
            </h2>
            <label className="cursor-pointer text-[13.5px] text-ink-mute" htmlFor={`${id}-f`}>
              {subiendo ? t('Subiendo…', 'Uploading…') : t('Suéltalo aquí o elígelo. PDF o foto, hasta 10 MB.', 'Drop it here or choose it. PDF or photo, up to 10 MB.')}
            </label>
          </div>
        </div>
        <Field htmlFor={`${id}-k`} label={t('Tipo', 'Type')}>
          <select className={`${FIELD_CLASS} min-w-[150px]`} id={`${id}-k`} onChange={(e) => setTipo(e.target.value as TipoDeDocumento)} value={tipo}>
            {TIPOS_DE_ARCHIVO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {traducir(NOMBRE_DE_DOCUMENTO[tipo], t)}
              </option>
            ))}
          </select>
        </Field>
        {proveedores.length === 0 ? null : (
          <Field htmlFor={`${id}-p`} label={t('Proveedor', 'Vendor')}>
            <select className={`${FIELD_CLASS} min-w-[170px]`} id={`${id}-p`} onChange={(e) => setProveedor(e.target.value)} value={proveedor}>
              <option value="">{t('Ninguno', 'None')}</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Field>
        )}
        <label className={`${botonClases('primary')} cursor-pointer`} htmlFor={`${id}-f`}>
          {t('Elegir archivo', 'Choose file')}
        </label>
        <input
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={subiendo}
          id={`${id}-f`}
          multiple
          onChange={(e) => {
            subir([...(e.target.files ?? [])], campos)
            e.target.value = ''
          }}
          type="file"
        />
      </div>
      {error === null ? null : <PanelAlert tone="error">{error}</PanelAlert>}
    </section>
  )
}

function Quitar({ evento, id, nombre, enLinea = false }: { evento: Evento; id: string; nombre: string; enLinea?: boolean }) {
  const t = useT()
  const router = useRouter()
  const [quitando, empezar] = useTransition()
  return (
    <IconButton
      className={enLinea ? 'hover:border-danger hover:text-danger' : 'absolute top-1.5 right-1.5 hidden bg-white/95 group-hover:grid group-focus-within:grid hover:text-danger'}
      disabled={quitando}
      label={t(`Quitar ${nombre}`, `Remove ${nombre}`)}
      onClick={() =>
        empezar(async () => {
          const fd = new FormData()
          fd.set('eventId', evento.eventId)
          fd.set('eventSlug', evento.eventSlug)
          fd.set('documentId', id)
          await removeDocumentAction({ status: 'idle' }, fd)
          router.refresh()
        })
      }
    >
      <TrashIcon className="size-3.5" />
    </IconButton>
  )
}

/** Soltar o tocar para subir fotos de inspiración al tema de su tarjeta. */
function ZonaDeSubida({ evento, campos, texto, accept }: { evento: Evento; campos: Record<string, string>; texto: string; accept: string }) {
  const t = useT()
  const id = useId()
  const [encima, setEncima] = useState(false)
  const { subir, subiendo, error } = useSubida(evento)
  const todo = { kind: 'referencia', ...campos }
  return (
    <div className="flex flex-col gap-2">
      <label
        className={`flex cursor-pointer flex-wrap items-center gap-3 rounded-[14px] border border-dashed px-4 py-4 transition ${encima ? 'border-gold bg-bg-top' : 'border-line-panel-strong hover:border-gold'}`}
        htmlFor={id}
        onDragLeave={() => setEncima(false)}
        onDragOver={(e) => {
          e.preventDefault()
          setEncima(true)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setEncima(false)
          subir([...(e.dataTransfer?.files ?? [])], todo)
        }}
      >
        <UploadIcon className="size-5 shrink-0 text-gold-deep" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[14px] text-ink">{subiendo ? t('Subiendo…', 'Uploading…') : texto}</span>
          <span className="text-[12.5px] text-ink-mute">{t('Fotos JPG, PNG o WEBP, hasta 10 MB', 'JPG, PNG or WEBP photos, up to 10 MB')}</span>
        </span>
        <span aria-hidden className={`${botonClases('default')} pointer-events-none shrink-0`}>
          {t('Elegir fotos', 'Choose photos')}
        </span>
        <input
          accept={accept}
          className="sr-only"
          disabled={subiendo}
          id={id}
          multiple
          onChange={(e) => {
            subir([...(e.target.files ?? [])], todo)
            e.target.value = ''
          }}
          type="file"
        />
      </label>
      {error === null ? null : <PanelAlert tone="error">{error}</PanelAlert>}
    </div>
  )
}
