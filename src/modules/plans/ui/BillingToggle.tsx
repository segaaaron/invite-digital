'use client'

import { useState } from 'react'
import type { Allowance } from '../domain/allowance'
import { hasAnnual, PlanCard, type PlanPrice } from './PlanCard'

export type PlanCardData = {
  readonly id: string
  readonly current: boolean
  readonly allowance: Allowance
  readonly price?: PlanPrice | undefined
  /** Adónde lleva «Cambiar a…» desde esta tarjeta. */
  readonly changeHref?: string | undefined
}

/**
 * Las tarjetas de plan con el conmutador POR EVENTO / ANUAL de la maqueta.
 *
 * **El conmutador solo aparece si algún plan tiene precio anual cargado.** Hoy los planes
 * se cobran una vez por evento; pintar una suscripción sin precios detrás haría esperar
 * una factura mensual que no existe.
 *
 * Recibe **datos**, no una función que pinte: un componente cliente no puede recibir
 * funciones desde el servidor, y hacerlo revienta la página entera en tiempo de
 * ejecución sin que el typecheck diga nada.
 */
export function BillingToggle({ plans }: { plans: readonly PlanCardData[] }) {
  const [billing, setBilling] = useState<'once' | 'annual'>('once')

  const hayAnual = plans.some((plan) => plan.price !== undefined && hasAnnual(plan.price))

  const tarjetas = (
    // Tres columnas solo cuando caben: en una tableta, tres tarjetas de plan estrujadas
    // parten el precio en dos líneas y dejan «por evento» fuera de la tarjeta.
    <div className="grid gap-5 min-[900px]:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard
          billing={billing}
          changeHref={plan.changeHref}
          current={plan.current}
          key={plan.id}
          plan={plan.allowance}
          price={plan.price}
        />
      ))}
    </div>
  )

  if (!hayAnual) return tarjetas

  const boton = (clave: 'once' | 'annual', texto: string) => (
    <button
      aria-pressed={billing === clave}
      className={`rounded-full border px-3.5 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] uppercase transition-colors ${
        billing === clave ? 'border-ink bg-ink text-white' : 'border-line-panel-strong bg-white text-ink hover:border-ink'
      }`}
      onClick={() => setBilling(clave)}
      type="button"
    >
      {texto}
    </button>
  )

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-center gap-2.5">
        {boton('once', 'Por evento')}
        {boton('annual', 'Anual')}
      </div>
      {tarjetas}
    </div>
  )
}
