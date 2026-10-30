'use client'

import { useActionState, type ReactNode } from 'react'
import { ActionFeedback } from './estados'
import { sinCaerse } from '../sin-caerse'
import { SIN_EMPEZAR, type EstadoDeAccion } from '@/shared/forms/estado-de-accion'

/**
 * **Un botón suelto que sí dice lo que pasó.**
 *
 * Las pantallas del panel que solo mandan un dato —una huella, un identificador— lo hacían con
 * un `<form action={accion}>` y una acción que devolvía `void`: si la acción se iba por una
 * rama de error, el botón se pulsaba y no ocurría nada, sin una palabra. Aquí la acción
 * devuelve su `{ status, message }` y el aviso se pinta debajo del botón.
 *
 * El botón lo pone quien llama (`children`), para no cambiarle la piel a ninguna pantalla; los
 * campos ocultos salen de `campos`.
 */
export function AccionConAviso({
  accion,
  campos,
  children,
  className,
  /** El acierto ya se ve en la pantalla (la fila se va, aparece el código): solo se avisa del error. */
  soloErrores = true,
}: {
  accion: (previo: EstadoDeAccion, datos: FormData) => Promise<EstadoDeAccion>
  campos: Readonly<Record<string, string>>
  children: ReactNode
  className?: string
  soloErrores?: boolean
}) {
  const [estado, enviar] = useActionState(sinCaerse(accion), SIN_EMPEZAR)
  return (
    <form action={enviar} className={className}>
      {Object.entries(campos).map(([clave, valor]) => (
        <input key={clave} name={clave} type="hidden" value={valor} />
      ))}
      {children}
      <ActionFeedback errorsOnly={soloErrores} state={estado} />
    </form>
  )
}
