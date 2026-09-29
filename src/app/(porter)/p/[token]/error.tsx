'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'

/** La recepción del día del evento: reintentar es lo único que importa; el enlace de acceso sigue valiendo. */
export default function ErrorDeLaRecepcion({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PantallaDeError error={error} reset={reset} texto="No se pudo cargar la recepción. Vuelve a intentarlo; los ingresos ya registrados no se perdieron." />
}
