'use client'

import { useActionState, useId } from 'react'
import { FilePicker } from '@/shared/design/ui/panel/FilePicker'
import { FIELD_CLASS, Field, PanelAlert, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { type DiaActionState, removeDocumentAction, uploadDocumentAction } from '../dia-actions'
import { NOMBRE_DE_DOCUMENTO, TIPOS_DE_DOCUMENTO, type TipoDeDocumento } from '../domain/dia-d'
import { Accion, type Evento, Ocultos } from './Accion'

const INICIAL: DiaActionState = { status: 'idle' }

export type DocumentoVista = {
  readonly id: string
  readonly kind: TipoDeDocumento
  readonly topic: string | null
  readonly originalName: string
  readonly peso: string
  /** Del proveedor o la partida a la que está enlazado, ya en palabras. */
  readonly enlazado: string | null
  readonly href: string
}

type Opcion = { id: string; nombre: string }

/** Contratos, cotizaciones, facturas y fotos de referencia: privados, se descargan. */
export function DocumentsBoard({ evento, documentos, proveedores, partidas }: { evento: Evento; documentos: readonly DocumentoVista[]; proveedores: readonly Opcion[]; partidas: readonly Opcion[] }) {
  const [estado, subir, subiendo] = useActionState(uploadDocumentAction, INICIAL)
  const id = useId()
  return (
    <div className="flex flex-col gap-5">
      <form action={subir} className="flex flex-col gap-3 rounded-[16px] border border-line-panel bg-bg-raised p-4">
        <Ocultos {...evento} />
        <FilePicker accept="application/pdf,image/jpeg,image/png,image/webp" hint="PDF o imagen, hasta 10 MB" label="Elegir documento" name="file" />
        <div className="grid gap-3 min-[560px]:grid-cols-2">
          <Field htmlFor={`${id}-k`} label="Es">
            <select className={FIELD_CLASS} defaultValue="contrato" id={`${id}-k`} name="kind">
              {TIPOS_DE_DOCUMENTO.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_DE_DOCUMENTO[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field htmlFor={`${id}-t`} label="Tema · para las referencias">
            <input className={FIELD_CLASS} id={`${id}-t`} maxLength={80} name="topic" placeholder="Vestido, decoración, torta…" />
          </Field>
          <Field htmlFor={`${id}-v`} label="Proveedor">
            <select className={FIELD_CLASS} defaultValue="" id={`${id}-v`} name="vendorId">
              <option value="">Ninguno</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field htmlFor={`${id}-p`} label="Partida">
            <select className={FIELD_CLASS} defaultValue="" id={`${id}-p`} name="budgetItemId">
              <option value="">Ninguna</option>
              {partidas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
        {estado.status === 'success' ? <PanelAlert tone="ok">Documento guardado.</PanelAlert> : null}
        <div>
          <PanelButton disabled={subiendo} type="submit" variant="primary">
            {subiendo ? 'Subiendo…' : 'Subir documento'}
          </PanelButton>
        </div>
      </form>

      {documentos.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Todavía no hay documentos.</p>
      ) : (
        <ul className="flex flex-col">
          {documentos.map((d) => (
            <li aria-label={d.originalName} className="flex flex-wrap items-center justify-between gap-3 border-b border-line-panel py-3 last:border-none" key={d.id}>
              <span className="flex min-w-0 flex-col">
                <a className="truncate text-[14px] text-ink underline underline-offset-2" download href={d.href}>
                  {d.originalName}
                </a>
                <span className="text-[11px] text-ink-mute">{[NOMBRE_DE_DOCUMENTO[d.kind], d.topic, d.enlazado, d.peso].filter(Boolean).join(' · ')}</span>
              </span>
              <Accion action={removeDocumentAction} evento={evento} extra={{ documentId: d.id }} label={`Quitar ${d.originalName}`} variant="danger">
                Quitar
              </Accion>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
