'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { PanelButton } from './PanelKit'
import { useSoloLectura } from './solo-lectura'

export type SubmitButtonProps = {
  children: ReactNode
  /** Lo que dice mientras se envía: «Guardando…». Sin él conserva su texto y solo marca la espera. */
  pendingLabel?: ReactNode
  /**
   * El estado de fuera, para el botón que envía **otro** formulario (`form="…"`): ahí
   * `useFormStatus` no ve el envío, porque solo mira su formulario antecesor.
   */
  pending?: boolean
  variant?: 'primary' | 'default' | 'danger'
  disabled?: boolean
  /** Envía el formulario con este `id` aunque el botón viva fuera de él. */
  form?: string
  name?: string
  value?: string
  className?: string
  'aria-label'?: string
  /** Sigue activo en un evento ya celebrado (lo que la guardia deja con `aunCelebrado`). */
  aunCelebrado?: boolean
}

/**
 * El botón que envía un formulario del panel.
 *
 * Estaba escrito a mano en 48 ficheros —`disabled={pendiente}` y `{pendiente ? 'Guardando…' :
 * 'Guardar'}`—, cada uno con su variante y ninguno con `aria-busy`. Aquí el estado sale de
 * `useFormStatus`: el botón sabe solo que su formulario se está enviando.
 *
 * - **Se bloquea mientras espera**: un doble clic no envía dos veces.
 * - **`aria-busy`** le dice al lector de pantalla que la acción está en curso, y el texto de
 *   espera cambia su nombre accesible.
 * - El indicador es un punto que late, no un disco girando, y con movimiento reducido se queda
 *   quieto (`animate-latido` lo apaga `globals.css`).
 */
export function SubmitButton({ children, pendingLabel, pending, variant = 'primary', disabled = false, aunCelebrado = false, ...rest }: SubmitButtonProps) {
  const { pending: enviando } = useFormStatus()
  const esperando = pending ?? enviando
  const soloMirar = useSoloLectura() && !aunCelebrado

  return (
    <PanelButton
      aria-busy={esperando || undefined}
      disabled={disabled || esperando || soloMirar}
      title={soloMirar ? 'El evento ya se celebró: queda para mirar' : undefined}
      {...(aunCelebrado ? { 'data-aun-celebrado': '' } : {})}
      type="submit"
      variant={variant}
      {...rest}
    >
      {esperando ? <span aria-hidden className="size-1.5 animate-latido rounded-full bg-current" /> : null}
      {esperando && pendingLabel !== undefined ? pendingLabel : children}
    </PanelButton>
  )
}
