'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'

/** La web pública: en español y en inglés, porque aquí no se sabe si el idioma cargó. */
export default function ErrorDeLaWeb({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PantallaDeError
      error={error}
      reintentar="Volver a intentar · Try again"
      reset={reset}
      salida={{ href: '/', rotulo: 'Inicio · Home' }}
      texto="No se pudo cargar esta página. Vuelve a intentarlo en un momento. — This page couldn't load; please try again."
      titulo="Algo no salió bien"
    />
  )
}
