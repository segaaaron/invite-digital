'use client'

import { useRouter } from 'next/navigation'
import { type DragEvent, useId, useState, useTransition } from 'react'
import { removeDocumentAction, uploadDocumentAction } from '@/app/_acciones/planner/dia-actions'
import { TrashIcon, UploadIcon } from '@/shared/design/ui/icons'
import { IconButton, PanelAlert } from '@/shared/design/ui/panel/PanelKit'
import { NOMBRE_DE_DOCUMENTO, type TipoDeDocumento } from '../domain/dia-d'
import type { Evento } from './Accion'

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
  const [pestana, setPestana] = useState<'contratos' | 'inspiracion'>('contratos')
  const referencias = documentos.filter((d) => d.kind === 'referencia')
  const archivos = documentos.filter((d) => d.kind !== 'referencia')

  return (
    <div className="flex flex-col gap-5">
      <div aria-label="Qué ver" className="flex gap-1 self-start rounded-full bg-bg-top p-1" role="tablist">
        {(
          [
            ['contratos', `Contratos y cotizaciones (${archivos.length})`],
            ['inspiracion', `Inspiración (${referencias.length})`],
          ] as const
        ).map(([clave, texto]) => (
          <button
            aria-selected={pestana === clave}
            className={`cursor-pointer rounded-full px-4 py-2 text-[13px] transition ${pestana === clave ? 'bg-white text-ink shadow-card' : 'text-ink-soft hover:text-ink'}`}
            key={clave}
            onClick={() => setPestana(clave)}
            role="tab"
            type="button"
          >
            {texto}
          </button>
        ))}
      </div>

      {pestana === 'contratos' ? (
        <div className="grid gap-4 min-[900px]:grid-cols-2">
          {[...proveedores, { id: '', nombre: 'Otros documentos' }].map((p) => (
            <Tarjeta key={p.id || 'otros'} titulo={p.nombre}>
              <ListaDeArchivos documentos={archivos.filter((d) => (d.vendorId ?? '') === p.id)} evento={evento} />
              <ZonaDeSubida accept="application/pdf,image/jpeg,image/png,image/webp" campos={{ vendorId: p.id }} conTipo evento={evento} texto="Arrastra aquí el contrato o la cotización" />
            </Tarjeta>
          ))}
          {proveedores.length === 0 ? (
            <p className="text-[13px] text-ink-soft min-[900px]:col-span-2">
              Suma a tus proveedores en «Proveedores» y cada uno tendrá aquí su tarjeta para sus contratos.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {TEMAS.map((tema) => {
            const fotos = referencias.filter((d) => (d.topic ?? 'Otros') === tema || (tema === 'Otros' && !TEMAS.includes(d.topic as (typeof TEMAS)[number])))
            return (
              <Tarjeta key={tema} titulo={tema}>
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
                <ZonaDeSubida accept="image/jpeg,image/png,image/webp" campos={{ kind: 'referencia', topic: tema }} evento={evento} multiple texto={`Arrastra aquí fotos de ${tema.toLowerCase()}`} />
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
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-[16px] border border-line-panel bg-white p-4">
      <h3 className="m-0 font-display text-[18px] text-ink" id={id}>
        {titulo}
      </h3>
      {children}
    </section>
  )
}

function ListaDeArchivos({ documentos, evento }: { documentos: readonly DocumentoVista[]; evento: Evento }) {
  if (documentos.length === 0) return null
  return (
    <ul className="flex flex-col divide-y divide-line-panel">
      {documentos.map((d) => (
        <li className="relative flex items-center justify-between gap-3 py-2" key={d.id}>
          <a className="min-w-0 truncate text-[13.5px] text-ink underline underline-offset-2" download href={d.href}>
            {d.originalName}
          </a>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-[11px] text-ink-mute">{`${NOMBRE_DE_DOCUMENTO[d.kind]} · ${d.peso}`}</span>
            <Quitar enLinea evento={evento} id={d.id} nombre={d.originalName} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function Quitar({ evento, id, nombre, enLinea = false }: { evento: Evento; id: string; nombre: string; enLinea?: boolean }) {
  const router = useRouter()
  const [quitando, empezar] = useTransition()
  return (
    <IconButton
      className={enLinea ? 'hover:border-danger hover:text-danger' : 'absolute top-1.5 right-1.5 hidden bg-white/95 group-hover:grid group-focus-within:grid hover:text-danger'}
      disabled={quitando}
      label={`Quitar ${nombre}`}
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

/**
 * Soltar o tocar para subir. Sube en cuanto llega el archivo, uno por uno, con los datos de la
 * tarjeta donde se soltó. En contratos, antes se elige qué es —contrato por defecto—.
 */
function ZonaDeSubida({
  evento,
  campos,
  texto,
  accept,
  multiple = false,
  conTipo = false,
}: {
  evento: Evento
  campos: Record<string, string>
  texto: string
  accept: string
  multiple?: boolean
  conTipo?: boolean
}) {
  const router = useRouter()
  const id = useId()
  const [tipo, setTipo] = useState<TipoDeDocumento>('contrato')
  const [encima, setEncima] = useState(false)
  const [subiendo, empezar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const subir = (archivos: readonly File[]) => {
    if (archivos.length === 0) return
    setError(null)
    empezar(async () => {
      for (const archivo of archivos) {
        const fd = new FormData()
        fd.set('eventId', evento.eventId)
        fd.set('eventSlug', evento.eventSlug)
        fd.set('kind', conTipo ? tipo : 'referencia')
        for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor)
        fd.set('file', archivo)
        const r = (await uploadDocumentAction({ status: 'idle' }, fd)) as { status: string; message?: string }
        if (r.status === 'error') {
          setError(`${archivo.name}: ${r.message ?? 'no se pudo subir.'}`)
          break
        }
      }
      router.refresh()
    })
  }

  const soltar = (evento: DragEvent) => {
    evento.preventDefault()
    setEncima(false)
    subir([...(evento.dataTransfer?.files ?? [])])
  }

  return (
    <div className="flex flex-col gap-2">
      {conTipo ? (
        <div aria-label="Qué vas a subir" className="flex flex-wrap gap-1.5" role="radiogroup">
          {TIPOS_DE_ARCHIVO.map((t) => (
            <button
              aria-checked={tipo === t}
              className={`cursor-pointer rounded-full border px-3 py-1 text-[12px] ${tipo === t ? 'border-ink bg-ink text-white' : 'border-line-panel text-ink-soft hover:border-line-panel-strong'}`}
              key={t}
              onClick={() => setTipo(t)}
              role="radio"
              type="button"
            >
              {NOMBRE_DE_DOCUMENTO[t]}
            </button>
          ))}
        </div>
      ) : null}
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-[14px] border border-dashed px-4 py-3.5 transition ${
          encima ? 'border-ink bg-bg-top' : 'border-line-panel-strong hover:border-ink'
        }`}
        htmlFor={id}
        onDragLeave={() => setEncima(false)}
        onDragOver={(e) => {
          e.preventDefault()
          setEncima(true)
        }}
        onDrop={soltar}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bg-top text-ink-soft">
          <UploadIcon className="size-4" />
        </span>
        <span className="flex flex-col">
          <span className="text-[13px] text-ink">{subiendo ? 'Subiendo…' : texto}</span>
          <span className="text-[11px] text-ink-mute">{`o toca para elegir · ${conTipo ? 'PDF o imagen' : 'fotos JPG, PNG o WEBP'}, hasta 10 MB`}</span>
        </span>
        <input
          accept={accept}
          className="sr-only"
          disabled={subiendo}
          id={id}
          multiple={multiple}
          onChange={(e) => {
            subir([...(e.target.files ?? [])])
            e.target.value = ''
          }}
          type="file"
        />
      </label>
      {error === null ? null : <PanelAlert tone="error">{error}</PanelAlert>}
    </div>
  )
}
