'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'

/** El escaparate de un modelo. */
export default function ErrorDelModelo({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PantallaDeError
      error={error}
      reintentar="Volver a intentar · Try again"
      reset={reset}
      salida={{ href: '/es/colecciones', rotulo: 'Ver los modelos' }}
      texto="No se pudo cargar este modelo. Vuelve a intentarlo en un momento."
    />
  )
}
