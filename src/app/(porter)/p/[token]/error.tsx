'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'
import { useT } from '@/shared/i18n/idioma-navegador'

/** La recepción del día del evento: reintentar es lo único que importa; el enlace de acceso sigue valiendo. */
export default function ErrorDeLaRecepcion({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT()
  return <PantallaDeError error={error} reset={reset} texto={t('No se pudo cargar la recepción. Vuelve a intentarlo; los ingresos ya registrados no se perdieron.', 'Reception could not load. Try again; check-ins already recorded were not lost.')} />
}
