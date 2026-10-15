'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'
import { useT } from '@/shared/i18n/idioma-navegador'

/** El enlace del proveedor. */
export default function ErrorDelProveedor({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT()
  return <PantallaDeError error={error} reset={reset} texto={t('No se pudo cargar esta página. Vuelve a intentarlo en un momento.', 'This page could not load. Try again in a moment.')} />
}
