'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'
import { useIdioma, useT } from '@/shared/i18n/idioma-navegador'

export default function ErrorDelModelo({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT()
  const locale = useIdioma()
  return (
    <PantallaDeError
      error={error}
      reintentar={t('Volver a intentar', 'Try again')}
      reset={reset}
      salida={{ href: locale === 'es' ? '/es/colecciones' : '/en/collections', rotulo: t('Ver los modelos', 'See the designs') }}
      texto={t('No se pudo cargar este modelo. Vuelve a intentarlo en un momento.', 'This design couldn’t load. Please try again in a moment.')}
    />
  )
}
