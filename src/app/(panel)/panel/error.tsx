'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'
import { useT } from '@/shared/i18n/idioma-navegador'

/** Si algo del panel falla: la pantalla propia, dentro de la carcasa (la barra sigue ahí para moverse). */
export default function ErrorDelPanel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT()
  return <PantallaDeError error={error} reset={reset} salida={{ href: '/panel', rotulo: t('Ir al panel', 'Go to the panel') }} />
}
