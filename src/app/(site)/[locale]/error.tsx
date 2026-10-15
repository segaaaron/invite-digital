'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'
import { useIdioma, useT } from '@/shared/i18n/idioma-navegador'

export default function ErrorDeLaWeb({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT()
  const locale = useIdioma()
  return (
    <PantallaDeError
      error={error}
      reintentar={t('Volver a intentar', 'Try again')}
      reset={reset}
      salida={{ href: `/${locale}`, rotulo: t('Inicio', 'Home') }}
      texto={t('No se pudo cargar esta página. Vuelve a intentarlo en un momento.', 'This page couldn’t load. Please try again in a moment.')}
      titulo={t('Algo no salió bien', 'Something went wrong')}
    />
  )
}
