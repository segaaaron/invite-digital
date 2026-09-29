'use client'

import { useActionState } from 'react'
import { guardarAsistenteAction, type AsistenteState } from '@/app/_acciones/admin/asistente-actions'
import type { ConfigDelAsistente } from '../domain/config'
import { SettingsSection, SwitchRow, UnitField } from '@/shared/design/ui/panel/ajustes'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: AsistenteState = { status: 'idle' }

/** Admin › Asistente: qué planes traen a Luxury y sus dos topes. */
export function AjustesDelAsistente({ config, planes }: { config: ConfigDelAsistente; planes: readonly { slug: string; nombre: string }[] }) {
  const [estado, guardar] = useActionState(guardarAsistenteAction, INICIAL)
  return (
    <form action={guardar} className="flex flex-col">
      <SettingsSection description="Los eventos de estos planes ven el botón de Luxury. El corte está en el servidor." title="Planes con Luxury">
        <div className="flex max-w-[520px] flex-col">
          {planes.map((p) => (
            <SwitchRow defaultChecked={config.planes.includes(p.slug)} key={p.slug} label={p.nombre} name="plan" value={p.slug} />
          ))}
        </div>
      </SettingsSection>
      <SettingsSection description="Al llegar a la cuota del mes, Luxury lo dice y deja de llamar a OpenAI para ese evento. El techo apaga a Luxury en todo el sitio hasta el mes siguiente." title="Topes">
        <div className="grid max-w-[520px] gap-4 min-[560px]:grid-cols-2">
          <UnitField defaultValue={String(config.mensajesPorMes)} id="mensajes" label="Mensajes por evento y mes" name="mensajes" required unit="mensajes" />
          <UnitField defaultValue={String(config.presupuestoUsd)} hint="Lo que puede gastar todo el sitio en un mes." id="presupuesto" label="Techo de gasto del mes" name="presupuesto" required unit="USD" />
        </div>
      </SettingsSection>
      <div className="flex items-center gap-3 pt-4">
        <SubmitButton pendingLabel="Guardando…">Guardar</SubmitButton>
        <ActionFeedback state={estado} />
      </div>
    </form>
  )
}
