'use client'

import { useActionState } from 'react'
import { guardarAsistenteAction, type AsistenteState } from '@/app/_acciones/admin/asistente-actions'
import type { ConfigDelAsistente } from '../domain/config'
import { UnitField } from '@/shared/design/ui/panel/ajustes'
import { Field, FIELD_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useIdioma, useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: AsistenteState = { status: 'idle' }

/** Admin › Asistente: qué planes traen a Luxury y sus dos topes. */
export function AjustesDelAsistente({ config, planes, urlDeSiri }: { config: ConfigDelAsistente; planes: readonly { slug: string; nombre: string }[]; urlDeSiri: string }) {
  const t = useT()
  const locale = useIdioma()
  const [estado, guardar] = useActionState(sinCaerse(guardarAsistenteAction), INICIAL)
  return (
    // La maqueta (E45): los dos topes lado a lado, los planes como fichas que se marcan y, plegado, el atajo de Siri.
    <form action={guardar} className="flex flex-col gap-5">
      <div className="grid gap-4 min-[560px]:grid-cols-2">
        <UnitField defaultValue={String(config.mensajesPorMes)} id="mensajes" label={t('Mensajes al mes por evento', 'Messages per month per event')} name="mensajes" required unit={t('mensajes', 'messages')} />
        <UnitField defaultValue={String(config.presupuestoUsd)} hint={t('En dólares, para todo el sitio.', 'In dollars, for the whole site.')} id="presupuesto" label={t('Techo de gasto al mes', 'Monthly spending cap')} name="presupuesto" required unit="USD" />
      </div>
      <fieldset>
        <legend className="mb-2.5 text-[14px] font-medium">{t('Planes que lo incluyen', 'Plans that include it')}</legend>
        <div className="flex flex-wrap gap-2.5">
          {planes.map((p) => (
            <label
              className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-line-panel-strong bg-bg-raised px-3.5 text-[13.5px] font-medium has-[:checked]:border-shell-deep has-[:checked]:bg-shell-deep has-[:checked]:text-shell-ink max-[859px]:min-h-11"
              key={p.slug}
            >
              <input className="size-4 accent-[var(--color-gold)]" defaultChecked={config.planes.includes(p.slug)} name="plan" type="checkbox" value={p.slug} />
              {p.nombre}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-ink-mute">{t('Los eventos de estos planes tienen a Luxury. Los demás pueden comprarlo como extra.', 'Events on these plans have Luxury. Others can buy it as an extra.')}</p>
      </fieldset>
      <details className="group rounded-[12px] border border-line-panel">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-[14.5px] font-medium [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col">
            {t('Luxury con Siri', 'Luxury with Siri')}
            <span className="text-[13px] font-normal text-ink-mute">{t('Opcional: hablarle a Luxury desde el iPhone con «Oye Siri, Luxury».', 'Optional: talk to Luxury from the iPhone with “Hey Siri, Luxury”.')}</span>
          </span>
          <span aria-hidden className="text-ink-mute transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-line-panel px-4 py-4 text-[13.5px] text-ink-mute">
          {locale === 'es' ? (
            <p>
              Una vez, en tu iPhone, en la app Atajos: un atajo llamado «Luxury» con tres acciones — <strong>Dictar texto</strong>; <strong>Obtener contenido de URL</strong> (POST a{' '}
              <code className="font-codigo">{urlDeSiri}</code>, encabezado <code className="font-codigo">Authorization</code> = «Bearer » + la llave, que se pregunta al instalarlo, y cuerpo JSON{' '}
              <code className="font-codigo">texto</code> = Texto dictado); y <strong>Leer texto</strong>. Compártelo con «Copiar enlace de iCloud» y pégalo aquí: Mi cuenta lo ofrece con «Añadir a Siri».
            </p>
          ) : (
            <p>
              Once, on your iPhone, in the Shortcuts app: a shortcut called “Luxury” with three actions — <strong>Dictate Text</strong>; <strong>Get Contents of URL</strong> (POST to{' '}
              <code className="font-codigo">{urlDeSiri}</code>, header <code className="font-codigo">Authorization</code> = “Bearer ” + the key, asked when installing it, and JSON body{' '}
              <code className="font-codigo">texto</code> = Dictated Text); and <strong>Speak Text</strong>. Share it with “Copy iCloud Link” and paste it here: My account offers it with “Add to Siri”.
            </p>
          )}
          <Field hint={t('Vacío, Mi cuenta enseña cómo armar el atajo paso a paso.', 'Empty, My account shows how to build the shortcut step by step.')} label={t('Enlace del atajo (iCloud)', 'Shortcut link (iCloud)')}>
            {(props) => <input {...props} className={FIELD_CLASS} defaultValue={config.atajoDeSiri} inputMode="url" name="atajoDeSiri" placeholder="https://www.icloud.com/shortcuts/…" type="url" />}
          </Field>
        </div>
      </details>
      <div className="flex items-center justify-end gap-3">
        <ActionFeedback state={estado} />
        <SubmitButton pendingLabel={t('Guardando…', 'Saving…')}>{t('Guardar', 'Save')}</SubmitButton>
      </div>
    </form>
  )
}
